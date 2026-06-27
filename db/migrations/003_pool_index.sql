-- Hashrial — Pool Index Migration
-- Adds pool_index to users for multi-pool auto-assignment

ALTER TABLE users ADD COLUMN IF NOT EXISTS pool_index INT DEFAULT 0;
