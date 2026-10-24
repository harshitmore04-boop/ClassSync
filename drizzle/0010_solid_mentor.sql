CREATE TABLE `attendance_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`roll` text NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`student_id` text,
	`ip` text NOT NULL,
	`created` integer NOT NULL,
	`reviewer` text,
	`reviewed` integer,
	`receipt_hash` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_request_per_identity_session` ON `attendance_requests` (`token`,`roll`,`normalized_name`);