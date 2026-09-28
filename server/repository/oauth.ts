import type { OAuthFlow } from "../../schema/entity/oauth.ts";

export interface IOAuthRepository {
  deleteExpired: (now: number) => Promise<void>;
  deleteFlow: (id: string) => Promise<void>;
  createFlow: (flow: OAuthFlow) => Promise<void>;
  consumeFlow: (id: string) => Promise<OAuthFlow | undefined>;
}
