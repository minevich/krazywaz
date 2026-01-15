-- Migration: Add status field for draft mode
-- Status can be: 'draft', 'published', 'scheduled'

ALTER TABLE shiurim ADD COLUMN status TEXT DEFAULT 'published';

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_shiurim_status ON shiurim(status);

-- Update existing shiurim to 'published' status
UPDATE shiurim SET status = 'published' WHERE status IS NULL;
