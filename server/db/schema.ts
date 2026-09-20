import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    displayId: text("display_id"),
    picture: text("picture"),
    expires: integer("expires").notNull(),
  },
  (table) => [index("sessions_expires_idx").on(table.expires)],
);

export const flows = sqliteTable(
  "flows",
  {
    id: text("id").primaryKey(),
    state: text("state").notNull(),
    nonce: text("nonce").notNull(),
    verifier: text("verifier").notNull(),
    expires: integer("expires").notNull(),
  },
  (table) => [index("flows_expires_idx").on(table.expires)],
);
