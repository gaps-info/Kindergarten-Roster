CREATE TABLE `admin_config` (
	`id` integer PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`owner_email` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `published_schedule` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`mode` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`rows_json` text NOT NULL,
	`published_at` text NOT NULL,
	`published_by` text NOT NULL
);
