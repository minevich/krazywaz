import { NextResponse } from 'next/server'
import { getD1Database, getDb } from '@/lib/db'
import { systemCategories, systemCategoryRules } from '@/lib/schema'
import { asc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const d1 = await getD1Database()
        if (!d1) return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        const db = getDb(d1)

        // Fetch categories sorted by order
        const categories = await db.select()
            .from(systemCategories)
            .orderBy(asc(systemCategories.order))
            .all()

        // Fetch all rules
        const rules = await db.select()
            .from(systemCategoryRules)
            .orderBy(asc(systemCategoryRules.order))
            .all()

        // Group rules by category
        const result = categories
            .filter(cat => !cat.isHidden) // Filter out hidden categories for frontend
            .map(cat => ({
                name: cat.name,
                rules: rules.filter(r => r.categoryId === cat.id)
                    .map(r => ({
                        name: r.name,
                        keywords: JSON.parse(r.keywords)
                    }))
            }))

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('Error fetching categories:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
