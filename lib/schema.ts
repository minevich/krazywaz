import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    name: text('name'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date())
        .$onUpdate(() => new Date()),
})

export const shiurim = sqliteTable('shiurim', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    guid: text('guid').notNull().unique(),
    slug: text('slug').unique(), // Custom URL path, must be unique
    title: text('title').notNull(),
    description: text('description'),
    blurb: text('blurb'),
    audioUrl: text('audio_url').notNull(),
    sourceDoc: text('source_doc'), // URL to PDF (Google Drive, etc.)
    sourcesJson: text('sources_json'), // JSON array of clipped sources from SourceManager
    pubDate: integer('pub_date', { mode: 'timestamp' }).notNull(),
    duration: text('duration'),
    link: text('link'),
    thumbnail: text('thumbnail'), // URL to thumbnail image for social sharing
    status: text('status').$type<'draft' | 'published' | 'scheduled'>().default('published'), // Draft mode support
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date())
        .$onUpdate(() => new Date()),
})

export const platformLinks = sqliteTable('platform_links', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    shiurId: text('shiur_id')
        .notNull()
        .unique()
        .references(() => shiurim.id, { onDelete: 'cascade' }),
    youtube: text('youtube'),
    youtubeMusic: text('youtube_music'),
    spotify: text('spotify'),
    apple: text('apple'),
    amazon: text('amazon'),
    pocket: text('pocket'),
    twentyFourSix: text('twenty_four_six'),
    castbox: text('castbox'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .$defaultFn(() => new Date())
        .$onUpdate(() => new Date()),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Shiur = typeof shiurim.$inferSelect
export type NewShiur = typeof shiurim.$inferInsert

export type PlatformLink = typeof platformLinks.$inferSelect
export type NewPlatformLink = typeof platformLinks.$inferInsert

// Analytics tables
export const viewEvents = sqliteTable('view_events', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    shiurId: text('shiur_id').notNull().references(() => shiurim.id, { onDelete: 'cascade' }),
    timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    source: text('source').default('website'),
    userAgent: text('user_agent'),
    ipHash: text('ip_hash'),
})

export const analyticsCache = sqliteTable('analytics_cache', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    shiurId: text('shiur_id').notNull().unique().references(() => shiurim.id, { onDelete: 'cascade' }),
    websiteViews: integer('website_views').default(0),
    youtubeViews: integer('youtube_views').default(0),
    spotifyPlays: integer('spotify_plays').default(0),
    applePlays: integer('apple_plays').default(0),
    amazonPlays: integer('amazon_plays').default(0),
    otherPlays: integer('other_plays').default(0),
    totalViews: integer('total_views').default(0),
    lastYoutubeSync: integer('last_youtube_sync', { mode: 'timestamp' }),
    lastManualSync: integer('last_manual_sync', { mode: 'timestamp' }),
    lastUpdated: integer('last_updated', { mode: 'timestamp' }).$defaultFn(() => new Date()),
})

export const platformSyncs = sqliteTable('platform_syncs', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    platform: text('platform').notNull(),
    syncedAt: integer('synced_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    recordsUpdated: integer('records_updated').default(0),
    status: text('status').default('pending'),
    errorMessage: text('error_message'),
    metadata: text('metadata'),
})

export type ViewEvent = typeof viewEvents.$inferSelect
export type NewViewEvent = typeof viewEvents.$inferInsert

export type AnalyticsCache = typeof analyticsCache.$inferSelect
export type NewAnalyticsCache = typeof analyticsCache.$inferInsert

export type PlatformSync = typeof platformSyncs.$inferSelect
export type NewPlatformSync = typeof platformSyncs.$inferInsert
