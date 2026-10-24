CREATE TABLE `attendance_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`token` text NOT NULL,
	`status` text NOT NULL,
	`teacher` text NOT NULL,
	`time` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `sessions` ADD `class_date` text DEFAULT '' NOT NULL;