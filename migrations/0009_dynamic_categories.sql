CREATE TABLE `system_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`is_hidden` integer DEFAULT false,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `system_categories_name_unique` ON `system_categories` (`name`);
--> statement-breakpoint
CREATE TABLE `system_category_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`name` text NOT NULL,
	`keywords` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `system_categories`(`id`) ON UPDATE no action ON DELETE cascade
);
