import type { SessionUser } from "../entity/session.ts";

export type MeResponse = {
  user: SessionUser | null;
  loginConfigured: boolean;
};
