import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import type { SessionUser } from "../../schema/entity/session.ts";
import type { AppEnv } from "../env.ts";
import { hash } from "./crypto.ts";

export function cookie(c: Context<AppEnv>, name: string) {
  const value = getCookie(c, name);

  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
}

export async function getUser(
  c: Context<AppEnv>,
): Promise<SessionUser | undefined> {
  const id = cookie(c, "board_session");

  if (!id) return;

  return c.get("repositories").sessions.findUser(await hash(id), Date.now());
}
