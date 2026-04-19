import { pgTable, text, timestamp, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const experienceLevelEnum = pgEnum("experience_level", ["new", "casual", "experienced", "veteran"]);

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user ID
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  theme: text("theme").notNull().default("dark"),
  timezone: text("timezone").notNull().default("UTC"),

  // Phase 4: social profile
  bio: text("bio").notNull().default(""),
  playstyleTags: jsonb("playstyle_tags").$type<string[]>().notNull().default([]),
  experienceLevel: experienceLevelEnum("experience_level").notNull().default("casual"),
  availability: text("availability").notNull().default(""),
  isPublic: boolean("is_public").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
