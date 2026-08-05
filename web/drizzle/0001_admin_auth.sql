CREATE TABLE IF NOT EXISTS `admin_users` (
  `username` text PRIMARY KEY NOT NULL,
  `password_hash` text NOT NULL,
  `role` text NOT NULL,
  `must_change_password` integer DEFAULT 1 NOT NULL,
  `failed_attempts` integer DEFAULT 0 NOT NULL,
  `locked_until` text,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `admin_sessions` (
  `token_hash` text PRIMARY KEY NOT NULL,
  `username` text NOT NULL,
  `expires_at` text NOT NULL,
  `created_at` text NOT NULL
);
