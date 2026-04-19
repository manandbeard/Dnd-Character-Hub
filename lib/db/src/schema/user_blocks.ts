import { pgTable, text, serial, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const userBlocksTable = pgTable("user_blocks", {
  id: serial("id").primaryKey(),
  blockerUserId: text("blocker_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  blockedUserId: text("blocked_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique("user_block_unique").on(t.blockerUserId, t.blockedUserId)]);

export const insertUserBlockSchema = createInsertSchema(userBlocksTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUserBlock = z.infer<typeof insertUserBlockSchema>;
export type UserBlock = typeof userBlocksTable.$inferSelect;
