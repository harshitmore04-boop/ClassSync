CREATE TABLE `liveness_challenges` (
	`nonce` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`token` text NOT NULL,
	`purpose` text NOT NULL,
	`student_id` text NOT NULL,
	`challenge_order` text NOT NULL,
	`direction` integer NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL,
	`used` integer DEFAULT 0 NOT NULL
);
