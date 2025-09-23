CREATE TABLE `versions` (
	`id` text PRIMARY KEY NOT NULL,
	`seq` integer NOT NULL,
	`name` text,
	`created_at` integer NOT NULL,
	`document` text NOT NULL,
	`code` text NOT NULL,
	`is_named` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workflow_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
