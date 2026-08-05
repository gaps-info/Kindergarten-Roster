import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const adminUsers = sqliteTable("admin_users", {
  username: text("username").primaryKey(), passwordHash: text("password_hash").notNull(), mustChangePassword: integer("must_change_password").notNull().default(1), failedAttempts: integer("failed_attempts").notNull().default(0), lockedUntil: text("locked_until"), updatedAt: text("updated_at").notNull(),
});
export const adminSessions = sqliteTable("admin_sessions", {
  tokenHash: text("token_hash").primaryKey(), username: text("username").notNull(), expiresAt: text("expires_at").notNull(), createdAt: text("created_at").notNull(),
});
export const publishedSchedule = sqliteTable("published_schedule", {
  id: integer("id").primaryKey(), title: text("title").notNull(), mode: text("mode").notNull(), startDate: text("start_date").notNull(), endDate: text("end_date").notNull(), rowsJson: text("rows_json").notNull(), publishedAt: text("published_at").notNull(), publishedBy: text("published_by").notNull(),
});
