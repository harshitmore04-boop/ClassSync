CREATE TABLE `scan_events` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`student_id` text,
	`actor` text NOT NULL,
	`method` text NOT NULL,
	`ip` text NOT NULL,
	`status` text NOT NULL,
	`reason` text NOT NULL,
	`time` integer NOT NULL
);
