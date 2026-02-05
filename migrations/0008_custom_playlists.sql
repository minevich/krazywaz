CREATE TABLE `custom_playlists` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `custom_playlist_items` (
	`id` text PRIMARY KEY NOT NULL,
	`playlist_id` text NOT NULL,
	`shiur_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`added_at` integer NOT NULL,
	FOREIGN KEY (`playlist_id`) REFERENCES `custom_playlists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shiur_id`) REFERENCES `shiurim`(`id`) ON UPDATE no action ON DELETE cascade
);
