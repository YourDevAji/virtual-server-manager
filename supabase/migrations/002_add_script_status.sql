-- Migration to add script_status and script_error columns to instances table
-- This migration is safe to run even if columns already exist

-- Add script_status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instances' AND column_name = 'script_status'
  ) THEN
    ALTER TABLE instances 
    ADD COLUMN script_status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (script_status IN ('pending', 'running', 'completed', 'failed', 'skipped'));
  END IF;
END $$;

-- Add script_error column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instances' AND column_name = 'script_error'
  ) THEN
    ALTER TABLE instances 
    ADD COLUMN script_error TEXT;
  END IF;
END $$;

-- Create index for script_status for better query performance
CREATE INDEX IF NOT EXISTS idx_instances_script_status ON instances(script_status);

