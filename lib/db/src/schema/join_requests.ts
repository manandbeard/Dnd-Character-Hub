import { pgTable, text, serial, integer, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { campaignsTable } from "./campaigns";
import { usersTable } from "./users";

export const joinRequestStatusEnum = pgEnum("join_request_status", ["pending", "approved", "declined", "cancelled"]);

export const joinRequestsTable = pgTable("join_requests", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  message: text("message").notNull().default(""),
  status: joinRequestStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
}, (t) => [unique("join_request_unique_pending").on(t.campaignId, t.userId)]);

export const insertJoinRequestSchema = createInsertSchema(joinRequestsTable).omit({
  id: true,
  status: true,
  createdAt: true,
  decidedAt: true,
});
export type InsertJoinRequest = z.infer<typeof insertJoinRequestSchema>;
export type JoinRequest = typeof joinRequestsTable.$inferSelect;
