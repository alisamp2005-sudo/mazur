CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` varchar(255) NOT NULL,
	`phoneNumberId` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`),
	CONSTRAINT `agents_agentId_unique` UNIQUE(`agentId`)
);
--> statement-breakpoint
CREATE TABLE `call_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phoneNumberId` int NOT NULL,
	`agentId` int NOT NULL,
	`status` enum('waiting','processing','completed','failed') NOT NULL DEFAULT 'waiting',
	`priority` int NOT NULL DEFAULT 0,
	`retryCount` int NOT NULL DEFAULT 0,
	`maxRetries` int NOT NULL DEFAULT 3,
	`errorMessage` text,
	`scheduledAt` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `call_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `call_transcripts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`callId` int NOT NULL,
	`role` enum('user','agent') NOT NULL,
	`message` text NOT NULL,
	`timeInCallSecs` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `call_transcripts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` varchar(255),
	`callSid` varchar(255),
	`agentId` int NOT NULL,
	`phoneNumberId` int NOT NULL,
	`toNumber` varchar(50) NOT NULL,
	`status` enum('initiated','in-progress','processing','done','failed') NOT NULL DEFAULT 'initiated',
	`startTime` bigint,
	`endTime` bigint,
	`duration` int,
	`audioUrl` text,
	`audioPath` text,
	`hasAudio` boolean NOT NULL DEFAULT false,
	`hasTranscript` boolean NOT NULL DEFAULT false,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calls_id` PRIMARY KEY(`id`),
	CONSTRAINT `calls_conversationId_unique` UNIQUE(`conversationId`)
);
--> statement-breakpoint
CREATE TABLE `phone_numbers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(50) NOT NULL,
	`metadata` text,
	`status` enum('pending','queued','calling','completed','failed') NOT NULL DEFAULT 'pending',
	`agentId` int,
	`lastCallId` int,
	`callCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `phone_numbers_id` PRIMARY KEY(`id`)
);
