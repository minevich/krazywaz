import { NextResponse } from 'next/server'
import { getD1Database, getDb } from '@/lib/db'
import { shiurim, platformLinks } from '@/lib/schema'
import { eq } from 'drizzle-orm'

const TWENTY_FOUR_SIX_URL = 'https://24six.app/preview/podcast/collection/11014/rabbi-krazs-shiurim'

// POST - Set 24Six link for all shiurim
export async function POST() {
    try {
        const d1 = await getD1Database()
        if (!d1) {
            return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        }
        const db = getDb(d1)

        // Get all shiurim
        const allShiurim = await db.select().from(shiurim).all()

        // Get existing platform links
        const existingLinks = await db.select().from(platformLinks).all()
        const linksByShiurId = new Map(existingLinks.map(l => [l.shiurId, l]))

        let updated = 0
        let created = 0

        for (const shiur of allShiurim) {
            const existing = linksByShiurId.get(shiur.id)

            if (existing) {
                // Update existing record to set 24Six
                if (!existing.twentyFourSix || existing.twentyFourSix !== TWENTY_FOUR_SIX_URL) {
                    await db.update(platformLinks)
                        .set({
                            twentyFourSix: TWENTY_FOUR_SIX_URL,
                            updatedAt: new Date()
                        })
                        .where(eq(platformLinks.shiurId, shiur.id))
                    updated++
                }
            } else {
                // Create new platform link record with 24Six
                await db.insert(platformLinks).values({
                    shiurId: shiur.id,
                    twentyFourSix: TWENTY_FOUR_SIX_URL
                })
                created++
            }
        }

        return NextResponse.json({
            success: true,
            message: `24Six link set for all shiurim`,
            updated,
            created,
            total: allShiurim.length,
            url: TWENTY_FOUR_SIX_URL
        })
    } catch (error: any) {
        console.error('24Six fill error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
