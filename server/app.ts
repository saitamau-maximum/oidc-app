import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { MeResponse } from "../schema/api/session.ts";
import { getUser } from "./auth/session.ts";
import type { AppEnv } from "./env.ts";
import { createRepositories } from "./infrastructure/repository/index.ts";
import { createOAuthRouter } from "./routes/oauth.ts";

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Referrer-Policy", "no-referrer");
    c.header(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );

    const origin = c.env.APP_ORIGIN;
    const url = new URL(origin);

    if (
      url.origin !== origin ||
      (url.protocol !== "https:" &&
        !(
          url.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(url.hostname)
        ))
    ) {
      throw new Error("Invalid APP_ORIGIN");
    }

    c.set("config", {
      origin,
      clientId: c.env.OIDC_CLIENT_ID ?? "",
      clientSecret: c.env.OIDC_CLIENT_SECRET ?? "",
      issuer: c.env.OIDC_ISSUER,
      authorizationUrl: c.env.OIDC_AUTHORIZATION_URL,
      tokenUrl: c.env.OIDC_TOKEN_URL,
      jwksUrl: c.env.OIDC_JWKS_URL,
    });

    c.set("repositories", createRepositories(c.env.DB));

    if (
      !["GET", "HEAD", "OPTIONS"].includes(c.req.method) &&
      c.req.header("Origin") !== origin
    ) {
      return c.json({ error: "リクエスト元を確認できません。" }, 403);
    }

    await next();
  });

  app.use(
    "*",
    bodyLimit({
      maxSize: 16 * 1024,
      onError: (c) => c.json({ error: "リクエストが大きすぎます。" }, 413),
    }),
  );

  app.get("/api/me", async (c) =>
    c.json({
      user: (await getUser(c)) ?? null,
      loginConfigured: Boolean(
        c.get("config").clientId && c.get("config").clientSecret,
      ),
    } satisfies MeResponse),
  );

  app.route("/auth", createOAuthRouter());

  app.all("/api/*", (c) => c.json({ error: "APIが見つかりません。" }, 404));

  app.all("/auth/*", (c) =>
    c.json({ error: "認証ルートが見つかりません。" }, 404),
  );

  app.get("*", (c) => c.env.ASSETS.fetch(c.req.raw));

  app.onError((_error, c) =>
    c.json({ error: "処理に失敗しました。再度お試しください。" }, 500),
  );

  return app;
}
