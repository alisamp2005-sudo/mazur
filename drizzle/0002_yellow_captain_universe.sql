CREATE TABLE `call_ratings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`callId` int NOT NULL,
	`overallRating` int NOT NULL,
	`clarityScore` int,
	`engagementScore` int,
	`objectiveAchieved` boolean,
	`transferSuccessful` boolean,
	`feedback` text,
	`evaluationType` enum('manual','auto') NOT NULL DEFAULT 'manual',
	`evaluatedBy` varchar(255),
	`autoEvaluation` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `call_ratings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prompt_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agentId` int NOT NULL,
	`version` int NOT NULL,
	`promptText` text NOT NULL,
	`firstMessage` text,
	`isActive` boolean NOT NULL DEFAULT false,
	`description` text,
	`performanceMetrics` text,
	`callCount` int NOT NULL DEFAULT 0,
	`avgRating` int,
	`successRate` int,
	`createdBy` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prompt_versions_id` PRIMARY KEY(`id`)
);
