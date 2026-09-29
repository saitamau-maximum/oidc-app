import type { D1Database } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema.ts";

export const createDatabase = (binding: D1Database) =>
  drizzle(binding, { schema });

export type Database = ReturnType<typeof createDatabase>;
