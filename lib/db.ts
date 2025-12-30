import { drizzle } from 'drizzle-orm/d1'
import * as schema from './schema'

// Type for Cloudflare Workers environment
export interface Env {
    DB: D1Database
    YOUTUBE_API_KEY?: string
    RSS_FEED_URL?: string
    NEXTAUTH_SECRET?: string
}

// Global drizzle client  variable (for development with global singleton)
const globalForDb = globalThis as unknown as {
    db: ReturnType<typeof drizzle> | undefined
}

/**
 * Get database client
 * In Workers runtime, this will use the D1 binding from env
 * In development, it will use a global singleton
 */
export function getDb(d1Database: D1Database) {
    if (process.env.NODE_ENV !== 'production' && globalForDb.db) {
        return globalForDb.db
    }

    const db = drizzle(d1Database, { schema })

    if (process.env.NODE_ENV !== 'production') {
        globalForDb.db = db
    }

    return db
}

/**
 * Get D1 database from Cloudflare context
 * Works with OpenNext on Cloudflare
 */
export async function getD1Database(): Promise<D1Database | null> {
    try {
        // Try OpenNext's getCloudflareContext
        const { getCloudflareContext } = await import('@opennextjs/cloudflare')
        const ctx = await getCloudflareContext()
        const env = ctx?.env as any
        if (env?.DB) {
            return env.DB as D1Database
        }
    } catch (e) {
        // Fallback for other environments
    }

    // Fallback to globalThis
    if ((globalThis as any).DB) {
        return (globalThis as any).DB
    }

    return null
}

export type Database = ReturnType<typeof getDb>

// Export schema for easy access
export { schema }
