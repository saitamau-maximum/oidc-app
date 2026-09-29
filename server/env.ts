import type { D1Database } from "@cloudflare/workers-types";
import type { Config } from "./config.ts";
import type { Repositories } from "./repository/index.ts";

export type Bindings = {
  DB: D1Database;
  ASSETS: { fetch(request: Request): Promise<Response> };
  APP_ORIGIN: string;
  OIDC_CLIENT_ID?: string;
  OIDC_CLIENT_SECRET?: string;
  OIDC_ISSUER: string;
  OIDC_AUTHORIZATION_URL: string;
  OIDC_TOKEN_URL: string;
  OIDC_JWKS_URL: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    repositories: Repositories;
    config: Config;
  };
};
