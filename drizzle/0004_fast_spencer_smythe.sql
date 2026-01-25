CREATE TABLE `telegram_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`botToken` text,
	`chatId` varchar(255),
	`isActive` boolean NOT NULL DEFAULT false,
	`sendRecordings` boolean NOT NULL DEFAULT true,
	`sendTranscripts` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegram_settings_id` PRIMARY KEY(`id`)
);
