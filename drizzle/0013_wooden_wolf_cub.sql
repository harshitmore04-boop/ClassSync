CREATE TABLE `face_enrollment_links` (
	`token` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`owner` text NOT NULL,
	`creator_hash` text NOT NULL,
	`roster` text NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL,
	`open` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `face_enrollment_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`owner` text NOT NULL,
	`token` text NOT NULL,
	`student_id` text NOT NULL,
	`name` text NOT NULL,
	`roll` text NOT NULL,
	`account_id` text NOT NULL,
	`receipt_hash` text NOT NULL,
	`descriptors` text,
	`status` text NOT NULL,
	`created` integer NOT NULL,
	`reviewed` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_face_request_per_student` ON `face_enrollment_requests` (`scope`,`owner`,`student_id`);