CREATE TABLE `recordings` (
	`recording_id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`data` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`stopped_at` integer,
	`last_error` text
);
--> statement-breakpoint
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
CREATE INDEX `versions_seq_idx` ON `versions` (`seq`);--> statement-breakpoint
CREATE TABLE `workflow_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
