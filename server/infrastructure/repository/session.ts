import type { D1Database } from "@cloudflare/workers-types";
import { and, eq, gt } from "drizzle-orm";
import type { Session, SessionUser } from "../../../schema/entity/session.ts";
import { sessions } from "../../db/schema.ts";
import type { ISessionRepository } from "../../repository/session.ts";
import { createDatabase, type Database } from "../database.ts";

export class CloudflareSessionRepository implements ISessionRepository {
  private client: Database;

  constructor(db: D1Database) {
    this.client = createDatabase(db);
  }

  async findUser(id: string, now: number): Promise<SessionUser | undefined> {
    return this.client
      .select({
        id: sessions.userId,
        name: sessions.name,
        displayId: sessions.displayId,
        picture: sessions.picture,
      })
      .from(sessions)
      .where(and(eq(sessions.id, id), gt(sessions.expires, now)))
      .get();
  }

  async replace(session: Session, previousId?: string): Promise<void> {
    const insert = this.client.insert(sessions).values(session);

    if (previousId) {
      await this.client.batch([
        this.client.delete(sessions).where(eq(sessions.id, previousId)),
        insert,
      ]);
    } else {
      await insert;
    }
  }

  async delete(id: string): Promise<void> {
    await this.client.delete(sessions).where(eq(sessions.id, id));
  }
}
