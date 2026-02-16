-- Migration: Add Call Campaigns Support
-- This adds tables and columns for bulk call campaigns

-- Create call_campaigns table
CREATE TABLE IF NOT EXISTS call_campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  campaign_name VARCHAR(255) NOT NULL,
  status ENUM('draft', 'running', 'paused', 'completed', 'failed') DEFAULT 'draft',
  total_numbers INT NOT NULL DEFAULT 0,
  completed_calls INT NOT NULL DEFAULT 0,
  successful_calls INT NOT NULL DEFAULT 0,
  failed_calls INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  INDEX idx_application_id (application_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add campaign_id to voximplant_calls
ALTER TABLE voximplant_calls 
ADD COLUMN IF NOT EXISTS campaign_id INT NULL AFTER application_id,
ADD INDEX IF NOT EXISTS idx_campaign_id (campaign_id);
