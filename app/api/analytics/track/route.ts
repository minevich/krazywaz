import { NextRequest, NextResponse } from 'next/server'
import { getDb, getD1Database } from '@/lib/db'
import { viewEvents, analyticsCache } from '@/lib/schema'
import { eq, and, gte, sql } from 'drizzle-orm'
import crypto from 'crypto'

interface TrackRequest {
    shiurId: string
    source?: string
}

// Hash IP for privacy - we never store raw IPs
function hashIP(ip: string): string {
    return crypto.createHash('sha256').update(ip + 'salt-for-analytics').digest('hex').substring(0, 16)
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as TrackRequest
        const { shiurId, source = 'website' } = body

        if (!shiurId) {
            return NextResponse.json({ error: 'shiurId required' }, { status: 400 })
        }

        const d1 = await getD1Database()
        if (!d1) {
            return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
        }

        const db = getDb(d1)

        // Get IP and user agent for deduplication
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') ||
            'unknown'
        const userAgent = request.headers.get('user-agent') || 'unknown'
        const ipHash = hashIP(ip)

        // Debounce: Check if this IP viewed this shiur in the last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

        const recentView = await db
            .select()
            .from(viewEvents)
            .where(
                and(
                    eq(viewEvents.shiurId, shiurId),
                    eq(viewEvents.ipHash, ipHash),
                    gte(viewEvents.timestamp, oneHourAgo)
                )
            )
            .get()

        if (recentView) {
            // Already tracked recently, skip
            return NextResponse.json({ success: true, tracked: false, reason: 'debounced' })
        }

        // Insert new view event
        await db.insert(viewEvents).values({
            shiurId,
            source,
            userAgent: userAgent.substring(0, 500), // Truncate long user agents
            ipHash,
        })

        // Update the analytics cache
        await db
            .insert(analyticsCache)
            .values({
                shiurId,
                websiteViews: 1,
                totalViews: 1,
            })
            .onConflictDoUpdate({
                target: analyticsCache.shiurId,
                set: {
                    websiteViews: sql`${analyticsCache.websiteViews} + 1`,
                    totalViews: sql`${analyticsCache.totalViews} + 1`,
                    lastUpdated: sql`unixepoch()`,
                },
            })

        return NextResponse.json({ success: true, tracked: true })

    } catch (error) {
        console.error('Error tracking view:', error)
        return NextResponse.json({ error: 'Failed to track view' }, { status: 500 })
    }
}
