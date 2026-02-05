import { NextResponse } from 'next/server'
import { getD1Database, getDb } from '@/lib/db'
import { systemCategoryRules } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

// POST: Create a new rule
export async function POST(request: Request) {
    try {
        const d1 = await getD1Database()
        if (!d1) return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        const db = getDb(d1)

        const body = await request.json() as { categoryId: string, name: string, keywords: string[], order?: number }
        const { categoryId, name, keywords, order } = body

        if (!categoryId || !name || !keywords) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const newRule = await db.insert(systemCategoryRules)
            .values({
                categoryId,
                name,
                keywords: JSON.stringify(keywords), // Store as JSON string
                order: order || 0
            })
            .returning()
            .get()

        return NextResponse.json({ ...newRule, keywords: JSON.parse(newRule.keywords) })
    } catch (error: any) {
        console.error('Error creating rule:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// PUT: Update a rule (requires ID in body or query? Better to use [id] route, but for simplicity let's do batch or ID in body for now?
// Actually, standard REST suggests /api/admin/rules/[id] for PUT/DELETE.
// I'll make this file handle POST (Create) and handle PUT/DELETE logic in a separate dynamic route file `[id]/route.ts`.
// But wait, "Rules" are sub-resources. I'll put PUT/DELETE in `app/api/admin/rules/[id]/route.ts`.
// This file is `app/api/admin/rules/route.ts`.
