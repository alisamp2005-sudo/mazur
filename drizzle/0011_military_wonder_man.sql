ALTER TABLE `voximplant_accounts` ADD `apiKey` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `voximplant_accounts` DROP COLUMN `serviceAccountKeyId`;--> statement-breakpoint
ALTER TABLE `voximplant_accounts` DROP COLUMN `serviceAccountPrivateKey`;