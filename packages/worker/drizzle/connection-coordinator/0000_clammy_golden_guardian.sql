CREATE TABLE `pending_tool_requests` (
	`request_id` text PRIMARY KEY NOT NULL,
	`workflow_id` text NOT NULL,
	`tool` text NOT NULL,
	`params` text NOT NULL,
	`status` text NOT NULL,
	`response_data` text,
	`error` text,
	`created_at` integer NOT NULL,
	`resolved_at` integer
);
