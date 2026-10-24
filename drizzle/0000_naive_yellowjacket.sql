CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`token` text NOT NULL,
	`time` integer NOT NULL,
	`method` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_attendance_per_session` ON `attendance` (`student_id`,`token`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`subject` text NOT NULL,
	`room` text NOT NULL,
	`mode` text NOT NULL,
	`auth` text NOT NULL,
	`expires` integer NOT NULL,
	`open` integer NOT NULL,
	`ip` text,
	`require_ip` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`roll` text NOT NULL,
	`email` text NOT NULL,
	`descriptors` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `students_roll_unique` ON `students` (`roll`);--> statement-breakpoint
CREATE UNIQUE INDEX `students_email_unique` ON `students` (`email`);--> statement-breakpoint
CREATE TABLE `workspace` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL
);
