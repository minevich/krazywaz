-- Add slug column to shiurim table for custom URL paths
ALTER TABLE shiurim ADD COLUMN slug TEXT UNIQUE;

-- Create index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_shiurim_slug ON shiurim(slug);
