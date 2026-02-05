import { NextResponse } from 'next/server'
import { getD1Database, getDb } from '@/lib/db'
import { shiurim, platformLinks } from '@/lib/schema'
import { eq } from 'drizzle-orm'

interface BulkLinkRow {
    title: string
    youtube?: string
    youtubeMusic?: string
    spotify?: string
    apple?: string
    amazon?: string
    pocket?: string
    castbox?: string
}

// GET - Export shiurim with current links as CSV
export async function GET() {
    try {
        const d1 = await getD1Database()
        if (!d1) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        }
        const db = getDb(d1)

        // Get all shiurim with their platform links
        const allShiurim = await db.select().from(shiurim).orderBy(shiurim.pubDate).all()
        const allLinks = await db.select().from(platformLinks).all()

        const linkMap = new Map(allLinks.map(l => [l.shiurId, l]))

        // Build CSV
        const headers = ['title', 'youtube', 'youtubeMusic', 'spotify', 'apple', 'amazon', 'pocket', 'castbox']
        const rows = allShiurim.map(s => {
            const links = linkMap.get(s.id) || {} as any
            return [
                `"${s.title.replace(/"/g, '""')}"`,
                links.youtube || '',
                links.youtubeMusic || '',
                links.spotify || '',
                links.apple || '',
                links.amazon || '',
                links.pocket || '',
                links.castbox || ''
            ].join(',')
        })

        const csv = [headers.join(','), ...rows].join('\n')

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="shiurim-links.csv"'
            }
        })
    } catch (error: any) {
        console.error('Export error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST - Import bulk links from CSV data
export async function POST(request: Request) {
    try {
        const d1 = await getD1Database()
        if (!d1) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        }
        const db = getDb(d1)

        const body = await request.json() as { rows: BulkLinkRow[] }
        const { rows } = body

        if (!rows || !Array.isArray(rows)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 })
        }

        // Get all shiurim to match by title
        const allShiurim = await db.select().from(shiurim).all()
        const shiurByTitle = new Map(allShiurim.map(s => [s.title.toLowerCase().trim(), s]))

        // Get existing platform links
        const existingLinks = await db.select().from(platformLinks).all()
        const linksByShiurId = new Map(existingLinks.map(l => [l.shiurId, l]))

        let updated = 0
        let created = 0
        let notFound = 0
        const errors: string[] = []

        for (const row of rows) {
            if (!row.title) continue

            // Find matching shiur
            const shiur = shiurByTitle.get(row.title.toLowerCase().trim())
            if (!shiur) {
                notFound++
                errors.push(`Not found: ${row.title.substring(0, 50)}...`)
                continue
            }

            // Build update object (only include non-empty values)
            const updates: Record<string, string | Date> = {}
            if (row.youtube) updates.youtube = row.youtube
            if (row.youtubeMusic) updates.youtubeMusic = row.youtubeMusic
            if (row.spotify) updates.spotify = row.spotify
            if (row.apple) updates.apple = row.apple
            if (row.amazon) updates.amazon = row.amazon
            if (row.pocket) updates.pocket = row.pocket
            if (row.castbox) updates.castbox = row.castbox

            if (Object.keys(updates).length === 0) continue

            updates.updatedAt = new Date()

            const existingLink = linksByShiurId.get(shiur.id)

            if (existingLink) {
                await db.update(platformLinks)
                    .set(updates)
                    .where(eq(platformLinks.shiurId, shiur.id))
                updated++
            } else {
                await db.insert(platformLinks).values({
                    shiurId: shiur.id,
                    ...updates
                })
                created++
            }
        }

        return NextResponse.json({
            success: true,
            summary: {
                updated,
                created,
                notFound,
                total: rows.length
            },
            errors: errors.slice(0, 10) // Only show first 10 errors
        })
    } catch (error: any) {
        console.error('Import error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
