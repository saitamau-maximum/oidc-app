import type { IOAuthRepository } from "./oauth.ts";
import type { ISessionRepository } from "./session.ts";

export type Repositories = {
  oauth: IOAuthRepository;
  sessions: ISessionRepository;
};
