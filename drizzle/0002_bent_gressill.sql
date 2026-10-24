CREATE TABLE `learning_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`lesson_id` text NOT NULL,
	`done` integer NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_progress_per_lesson` ON `learning_progress` (`student_id`,`lesson_id`);--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`topic` text NOT NULL,
	`task` text NOT NULL,
	`resource` text NOT NULL,
	`due` text NOT NULL
);
