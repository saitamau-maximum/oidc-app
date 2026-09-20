import type { D1Database } from "@cloudflare/workers-types";
import { eq, lte } from "drizzle-orm";
import type { OAuthFlow } from "../../../schema/entity/oauth.ts";
import { flows, sessions } from "../../db/schema.ts";
import type { IOAuthRepository } from "../../repository/oauth.ts";
import { createDatabase, type Database } from "../database.ts";

export class CloudflareOAuthRepository implements IOAuthRepository {
  private client: Database;

  constructor(db: D1Database) {
    this.client = createDatabase(db);
  }

  async deleteExpired(now: number): Promise<void> {
    await this.client.batch([
      this.client.delete(flows).where(lte(flows.expires, now)),
      this.client.delete(sessions).where(lte(sessions.expires, now)),
    ]);
  }

  async deleteFlow(id: string): Promise<void> {
    await this.client.delete(flows).where(eq(flows.id, id));
  }

  async createFlow(flow: OAuthFlow): Promise<void> {
    await this.client.insert(flows).values(flow);
  }

  async consumeFlow(id: string): Promise<OAuthFlow | undefined> {
    const [flow] = await this.client
      .delete(flows)
      .where(eq(flows.id, id))
      .returning();
    return flow;
  }
}
