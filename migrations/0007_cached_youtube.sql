-- Migration: Add cached YouTube playlists and videos tables
-- Created: 2026-02-05

-- Cached YouTube playlists
CREATE TABLE IF NOT EXISTS cached_playlists (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail TEXT,
    video_count INTEGER DEFAULT 0,
    playlist_url TEXT,
    category TEXT,
    last_synced INTEGER
);

-- Cached YouTube videos within playlists
CREATE TABLE IF NOT EXISTS cached_videos (
    id TEXT PRIMARY KEY,
    playlist_id TEXT NOT NULL REFERENCES cached_playlists(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    thumbnail TEXT,
    duration TEXT,
    position INTEGER DEFAULT 0,
    shiur_id TEXT REFERENCES shiurim(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cached_videos_playlist ON cached_videos(playlist_id);
CREATE INDEX IF NOT EXISTS idx_cached_videos_shiur ON cached_videos(shiur_id);
CREATE INDEX IF NOT EXISTS idx_cached_playlists_category ON cached_playlists(category);
