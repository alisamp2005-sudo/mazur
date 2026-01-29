-- Migration: Create settings table
CREATE TABLE IF NOT EXISTS `settings` (
  `id` int AUTO_INCREMENT NOT NULL,
  `key` varchar(255) NOT NULL,
  `value` text NOT NULL,
  `description` text,
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `settings_id` PRIMARY KEY(`id`),
  CONSTRAINT `settings_key_unique` UNIQUE(`key`)
);

-- Insert default active extensions
INSERT INTO `settings` (`key`, `value`, `description`) 
VALUES ('active_extensions', '1000', 'Active 3CX extensions to monitor') 
ON DUPLICATE KEY UPDATE `key`=`key`;
