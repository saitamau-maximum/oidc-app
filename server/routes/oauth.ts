import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { errors } from "jose";
import { hash, random } from "../auth/crypto.ts";
import { cookie } from "../auth/session.ts";
import type { AppEnv } from "../env.ts";
import { createMaximumIdp } from "../infrastructure/maximum-idp.ts";

export function createOAuthRouter() {
  const router = new Hono<AppEnv>();

  router.get("/login", async (c) => {
    const config = c.get("config");
    const repositories = c.get("repositories");

    if (!config.clientId || !config.clientSecret)
      return c.redirect("/login?error=configuration");

    await repositories.oauth.deleteExpired(Date.now());

    const previous = cookie(c, "board_flow");

    if (previous) await repositories.oauth.deleteFlow(await hash(previous));

    const id = random();
    const state = random();
    const nonce = random();
    const verifier = random();

    await repositories.oauth.createFlow({
      id: await hash(id),
      state,
      nonce,
      verifier,
      expires: Date.now() + 600_000,
    });

    setCookie(c, "board_flow", id, {
      httpOnly: true,
      secure: config.origin.startsWith("https:"),
      sameSite: "Lax",
      path: "/",
      maxAge: 600,
    });

    const url = new URL(config.authorizationUrl);

    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: `${config.origin}/auth/callback`,
      response_type: "code",
      scope: "openid profile",
      state,
      nonce,
      code_challenge: await hash(verifier),
      code_challenge_method: "S256",
    }).toString();

    return c.redirect(url.href);
  });

  router.get("/callback", async (c) => {
    const config = c.get("config");
    const repositories = c.get("repositories");
    const options = {
      httpOnly: true,
      secure: config.origin.startsWith("https:"),
      sameSite: "Lax" as const,
      path: "/",
    };
    const id = cookie(c, "board_flow");

    deleteCookie(c, "board_flow", options);

    const flow = id
      ? await repositories.oauth.consumeFlow(await hash(id))
      : undefined;
    const state = c.req.query("state");
    const code = c.req.query("code");

    if (
      !flow ||
      flow.expires <= Date.now() ||
      state !== flow.state ||
      !code ||
      c.req.query("error")
    ) {
      console.warn("[oidc] callback rejected", {
        hasFlowCookie: Boolean(id),
        hasFlow: Boolean(flow),
        expired: Boolean(flow && flow.expires <= Date.now()),
        stateMatches: Boolean(flow && state === flow.state),
        hasCode: Boolean(code),
        hasProviderError: Boolean(c.req.query("error")),
      });
      return c.redirect("/login?error=authentication");
    }

    let stage = "provider_authentication";
    try {
      const current = await createMaximumIdp(config).authenticate(
        code,
        flow.verifier,
        flow.nonce,
      );
      stage = "session_creation";
      const old = cookie(c, "board_session");
      const session = random();
      await repositories.sessions.replace(
        {
          id: await hash(session),
          userId: current.id,
          name: current.name,
          displayId: current.displayId,
          picture: current.picture,
          expires: Date.now() + 28_800_000,
        },
        old ? await hash(old) : undefined,
      );
      setCookie(c, "board_session", session, { ...options, maxAge: 28_800 });
      return c.redirect("/my-page");
    } catch (error) {
      console.warn("[oidc] authentication failed", {
        stage,
        code:
          error instanceof errors.JOSEError
            ? error.code
            : "authentication_error",
        claim:
          error instanceof errors.JWTClaimValidationFailed &&
          ["iss", "aud", "exp", "iat", "sub", "nonce"].includes(error.claim)
            ? error.claim
            : undefined,
      });
      return c.redirect("/login?error=authentication");
    }
  });

  router.post("/logout", async (c) => {
    const id = cookie(c, "board_session");

    if (id) await c.get("repositories").sessions.delete(await hash(id));

    deleteCookie(c, "board_session", {
      httpOnly: true,
      secure: c.get("config").origin.startsWith("https:"),
      sameSite: "Lax",
      path: "/",
    });

    return c.body(null, 204);
  });
  return router;
}
