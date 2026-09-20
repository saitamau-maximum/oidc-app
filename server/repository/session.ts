import type { Session, SessionUser } from "../../schema/entity/session.ts";

export interface ISessionRepository {
  findUser: (id: string, now: number) => Promise<SessionUser | undefined>;
  replace: (session: Session, previousId?: string) => Promise<void>;
  delete: (id: string) => Promise<void>;
}
