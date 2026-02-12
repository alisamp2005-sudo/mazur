CREATE TABLE `voximplant_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accountId` varchar(255) NOT NULL,
	`serviceAccountKeyId` varchar(255) NOT NULL,
	`serviceAccountPrivateKey` text NOT NULL,
	`accountName` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `voximplant_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `voximplant_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`voximplantAccountId` int NOT NULL,
	`applicationId` varchar(255) NOT NULL,
	`applicationName` varchar(255) NOT NULL,
	`elevenlabsApiKey` text NOT NULL,
	`elevenlabsAgentId` varchar(255) NOT NULL,
	`scenarioCode` text,
	`phoneNumber` varchar(50),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `voximplant_applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `voximplant_calls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`callId` varchar(255) NOT NULL,
	`conversationId` varchar(255),
	`fromNumber` varchar(50),
	`toNumber` varchar(50) NOT NULL,
	`startTime` bigint,
	`endTime` bigint,
	`duration` int,
	`cost` int,
	`status` enum('answered','failed','busy','no-answer') NOT NULL,
	`hasTranscript` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `voximplant_calls_id` PRIMARY KEY(`id`),
	CONSTRAINT `voximplant_calls_callId_unique` UNIQUE(`callId`)
);
--> statement-breakpoint
CREATE TABLE `voximplant_transcripts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`callId` int NOT NULL,
	`conversationId` varchar(255) NOT NULL,
	`transcriptData` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `voximplant_transcripts_id` PRIMARY KEY(`id`)
);
