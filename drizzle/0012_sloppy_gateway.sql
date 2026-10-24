CREATE TABLE `demo_qr_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`roll` text NOT NULL,
	`student_id` text,
	`status` text NOT NULL,
	`receipt_hash` text NOT NULL,
	`created` integer NOT NULL,
	`reviewed` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_demo_request_per_identity` ON `demo_qr_requests` (`token`,`roll`,`normalized_name`);--> statement-breakpoint
CREATE TABLE `demo_qr_sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`owner_hash` text NOT NULL,
	`creator_hash` text NOT NULL,
	`subject` text NOT NULL,
	`room` text NOT NULL,
	`auth` text NOT NULL,
	`class_date` text NOT NULL,
	`expires` integer NOT NULL,
	`open` integer NOT NULL,
	`require_ip` integer NOT NULL,
	`ip` text NOT NULL,
	`roster` text NOT NULL,
	`created` integer NOT NULL
);
