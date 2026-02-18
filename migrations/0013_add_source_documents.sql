-- Migration: Add source_documents table for multiple source sheets per shiur
CREATE TABLE IF NOT EXISTS `source_documents` (
    `id` text PRIMARY KEY NOT NULL,
    `shiur_id` text NOT NULL REFERENCES `shiurim`(`id`) ON DELETE CASCADE,
    `url` text NOT NULL,
    `type` text NOT NULL,
    `label` text,
    `position` integer NOT NULL DEFAULT 0,
    `created_at` integer NOT NULL
);
