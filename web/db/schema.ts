import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const adminConfig = sqliteTable("admin_config", {
  id: integer("id").primaryKey(), ownerUserId: text("owner_user_id").notNull(), ownerEmail: text("owner_email").notNull(), createdAt: text("created_at").notNull(),
});
export const publishedSchedule = sqliteTable("published_schedule", {
  id: integer("id").primaryKey(), title: text("title").notNull(), mode: text("mode").notNull(), startDate: text("start_date").notNull(), endDate: text("end_date").notNull(), rowsJson: text("rows_json").notNull(), publishedAt: text("published_at").notNull(), publishedBy: text("published_by").notNull(),
});
