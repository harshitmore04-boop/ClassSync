ALTER TABLE `messages` ADD `alert_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `messages_alert_key_unique` ON `messages` (`alert_key`);