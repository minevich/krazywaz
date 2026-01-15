-- Analytics Database Schema
-- Stage 1: Foundation tables for tracking views and platform data

-- Track individual website page views
CREATE TABLE IF NOT EXISTS view_events (
  id TEXT PRIMARY KEY,
  shiur_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  source TEXT DEFAULT 'website',
  user_agent TEXT,
  ip_hash TEXT,
  FOREIGN KEY (shiur_id) REFERENCES shiurim(id) ON DELETE CASCADE
);

-- Index for fast queries by shiur and time
CREATE INDEX IF NOT EXISTS idx_view_events_shiur ON view_events(shiur_id);
CREATE INDEX IF NOT EXISTS idx_view_events_timestamp ON view_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_view_events_ip_shiur ON view_events(ip_hash, shiur_id);

-- Aggregated analytics cache for fast reads
CREATE TABLE IF NOT EXISTS analytics_cache (
  id TEXT PRIMARY KEY,
  shiur_id TEXT UNIQUE NOT NULL,
  website_views INTEGER DEFAULT 0,
  youtube_views INTEGER DEFAULT 0,
  spotify_plays INTEGER DEFAULT 0,
  apple_plays INTEGER DEFAULT 0,
  amazon_plays INTEGER DEFAULT 0,
  other_plays INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  last_youtube_sync INTEGER,
  last_manual_sync INTEGER,
  last_updated INTEGER,
  FOREIGN KEY (shiur_id) REFERENCES shiurim(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_shiur ON analytics_cache(shiur_id);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_total ON analytics_cache(total_views DESC);

-- Platform sync history for audit trail
CREATE TABLE IF NOT EXISTS platform_syncs (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  synced_at INTEGER NOT NULL,
  records_updated INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_platform_syncs_platform ON platform_syncs(platform);
CREATE INDEX IF NOT EXISTS idx_platform_syncs_time ON platform_syncs(synced_at DESC);

-- Initialize analytics_cache for all existing shiurim
INSERT OR IGNORE INTO analytics_cache (id, shiur_id, last_updated)
SELECT 
  lower(hex(randomblob(16))),
  id,
  unixepoch()
FROM shiurim;
