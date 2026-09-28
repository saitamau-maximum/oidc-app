import { createRemoteJWKSet, jwtVerify } from "jose";
import type { SessionUser } from "../../schema/entity/session.ts";
import type { Config } from "../config.ts";

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

export function createMaximumIdp(config: Config) {
  const jwks = createRemoteJWKSet(new URL(config.jwksUrl));
  const callback = `${config.origin}/auth/callback`;
  return {
    async authenticate(
      code: string,
      verifier: string,
      nonce: string,
    ): Promise<SessionUser> {
      let stage = "token_request";
      try {
        const response = await fetch(config.tokenUrl, {
          method: "POST",
          signal: AbortSignal.timeout(10_000),
          // This Workers runtime supports manual/follow, but not error.
          // Reject redirects below with other non-2xx responses.
          redirect: "manual",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code: code,
            redirect_uri: callback,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code_verifier: verifier,
          }),
        });
        if (!response.ok) {
          const body: unknown = await response.json().catch(() => null);
          const code =
            body && typeof body === "object" && "error" in body
              ? body.error
              : undefined;
          console.warn("[oidc] token exchange failed", {
            status: response.status,
            code:
              typeof code === "string" &&
              [
                "invalid_request",
                "invalid_client",
                "invalid_grant",
                "unauthorized_client",
                "unsupported_grant_type",
                "invalid_scope",
                "server_error",
              ].includes(code)
                ? code
                : "unknown_error",
          });
          throw new Error("Token exchange failed");
        }
        stage = "token_response_json";
        const tokens = (await response.json()) as {
          id_token?: string;
          access_token?: string;
        };
        if (typeof tokens.id_token !== "string") {
          console.warn("[oidc] missing ID token");
          throw new Error("Missing ID token");
        }
        stage = "id_token_verification";
        const { payload } = await jwtVerify(tokens.id_token, jwks, {
          issuer: config.issuer,
          audience: config.clientId,
          algorithms: ["ES512"],
          requiredClaims: ["sub", "iat", "exp", "nonce"],
          maxTokenAge: "10m",
        });
        if (
          !payload.sub ||
          payload.nonce !== nonce ||
          (payload.azp !== undefined && payload.azp !== config.clientId) ||
          (Array.isArray(payload.aud) &&
            payload.aud.length > 1 &&
            payload.azp !== config.clientId)
        ) {
          console.warn("[oidc] invalid subject, nonce or authorized party");
          throw new Error("Invalid claims");
        }
        stage = "userinfo_request";
        if (typeof tokens.access_token !== "string" || !tokens.access_token)
          throw new Error("Missing access token");
        const profileResponse = await fetch(
          new URL("/oauth/resources/userinfo", config.issuer),
          {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
            signal: AbortSignal.timeout(10_000),
            redirect: "manual",
          },
        );
        if (!profileResponse.ok) {
          console.warn("[oidc] userinfo request failed", {
            status: profileResponse.status,
          });
          throw new Error("UserInfo request failed");
        }
        const profile: unknown = await profileResponse.json();
        if (
          !profile ||
          typeof profile !== "object" ||
          !("sub" in profile) ||
          profile.sub !== payload.sub
        )
          throw new Error("UserInfo subject mismatch");
        let picture: string | null = null;
        if ("picture" in profile && typeof profile.picture === "string") {
          try {
            const url = new URL(profile.picture);
            if (url.protocol === "https:" && !url.username && !url.password)
              picture = url.href;
          } catch {
            /* Missing or invalid image URLs use the initials avatar. */
          }
        }
        return {
          picture,
          id: JSON.stringify([payload.iss, payload.sub]),
          displayId:
            nonEmptyString(
              "preferred_username" in profile
                ? profile.preferred_username
                : undefined,
            ) ??
            nonEmptyString(payload.preferred_username) ??
            null,
          name:
            (
              nonEmptyString("name" in profile ? profile.name : undefined) ??
              nonEmptyString(payload.name)
            )?.slice(0, 100) ?? "Maximum メンバー",
        };
      } catch (error) {
        const name = error instanceof Error ? error.name : "UnknownError";
        console.warn("[oidc] provider operation failed", {
          stage,
          errorType: [
            "Error",
            "TypeError",
            "SyntaxError",
            "TimeoutError",
            "AbortError",
            "NotSupportedError",
            "DataError",
            "OperationError",
            "InvalidAccessError",
          ].includes(name)
            ? name
            : "OtherError",
        });
        throw error;
      }
    },
  };
}
