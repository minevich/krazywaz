-- Migration: Add FTS5 full-text search for shiurim
-- Created: 2026-01-14
-- This enables fast, ranked search across title, description, and blurb

-- Create the FTS5 virtual table
-- Using 'content' option to avoid data duplication (external content table)
CREATE VIRTUAL TABLE IF NOT EXISTS shiurim_fts USING fts5(
    id UNINDEXED,       -- Keep ID for joining, but don't index it
    title,              -- Searchable
    description,        -- Searchable
    blurb,              -- Searchable
    content='shiurim',  -- Links to the shiurim table
    content_rowid='rowid'
);

-- Populate the FTS table with existing data
INSERT INTO shiurim_fts(rowid, id, title, description, blurb)
SELECT rowid, id, title, COALESCE(description, ''), COALESCE(blurb, '')
FROM shiurim;

-- Trigger: Keep FTS in sync on INSERT
CREATE TRIGGER IF NOT EXISTS shiurim_fts_insert AFTER INSERT ON shiurim BEGIN
    INSERT INTO shiurim_fts(rowid, id, title, description, blurb)
    VALUES (NEW.rowid, NEW.id, NEW.title, COALESCE(NEW.description, ''), COALESCE(NEW.blurb, ''));
END;

-- Trigger: Keep FTS in sync on DELETE
CREATE TRIGGER IF NOT EXISTS shiurim_fts_delete AFTER DELETE ON shiurim BEGIN
    INSERT INTO shiurim_fts(shiurim_fts, rowid, id, title, description, blurb)
    VALUES ('delete', OLD.rowid, OLD.id, OLD.title, COALESCE(OLD.description, ''), COALESCE(OLD.blurb, ''));
END;

-- Trigger: Keep FTS in sync on UPDATE
CREATE TRIGGER IF NOT EXISTS shiurim_fts_update AFTER UPDATE ON shiurim BEGIN
    INSERT INTO shiurim_fts(shiurim_fts, rowid, id, title, description, blurb)
    VALUES ('delete', OLD.rowid, OLD.id, OLD.title, COALESCE(OLD.description, ''), COALESCE(OLD.blurb, ''));
    INSERT INTO shiurim_fts(rowid, id, title, description, blurb)
    VALUES (NEW.rowid, NEW.id, NEW.title, COALESCE(NEW.description, ''), COALESCE(NEW.blurb, ''));
END;
