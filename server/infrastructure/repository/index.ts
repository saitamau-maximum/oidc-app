import type { D1Database } from "@cloudflare/workers-types";
import type { Repositories } from "../../repository/index.ts";
import { CloudflareOAuthRepository } from "./oauth.ts";
import { CloudflareSessionRepository } from "./session.ts";

export function createRepositories(binding: D1Database): Repositories {
  return {
    oauth: new CloudflareOAuthRepository(binding),
    sessions: new CloudflareSessionRepository(binding),
  };
}
