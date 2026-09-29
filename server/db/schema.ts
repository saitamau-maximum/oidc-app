import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ここについては以下の講義資料を見ること
// https://course.maximum.vc/course/7cdd8286-b567-42cf-af02-f48c00cf7ec7/section/5d5681bf-0e4b-41b1-9762-f9440e9b660f

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
