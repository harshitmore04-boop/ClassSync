CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`audience` text NOT NULL,
	`recipient_email` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`created` integer NOT NULL,
	`read_at` integer,
	`email_status` text NOT NULL,
	`delivery_detail` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `students` ADD `parent_email` text DEFAULT '' NOT NULL;