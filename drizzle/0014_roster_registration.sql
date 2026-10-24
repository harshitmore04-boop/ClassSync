CREATE TABLE `registration_roster` (
 `student_id` text PRIMARY KEY NOT NULL,
 `roll` text NOT NULL UNIQUE,
 `expected_name` text NOT NULL DEFAULT '',
 `owner` text NOT NULL,
 `created` integer NOT NULL
);
