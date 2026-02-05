DROP TABLE cached_videos;
CREATE TABLE cached_videos (
    id text PRIMARY KEY NOT NULL,
    video_id text NOT NULL,
    playlist_id text NOT NULL,
    title text NOT NULL,
    thumbnail text,
    duration text,
    position integer DEFAULT 0,
    shiur_id text,
    FOREIGN KEY (playlist_id) REFERENCES cached_playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (shiur_id) REFERENCES shiurim(id)
);
