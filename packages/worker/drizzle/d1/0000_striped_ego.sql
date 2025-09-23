CREATE TABLE `workflows_index` (
	`id` text PRIMARY KEY NOT NULL,
	`do_name` text NOT NULL,
	`name` text,
	`type` text,
	`status` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
