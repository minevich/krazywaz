import { NextResponse } from 'next/server'
import { getD1Database, getDb } from '@/lib/db'
import { systemCategories, systemCategoryRules } from '@/lib/schema'
import { eq, asc } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

// Get all categories with their rules
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
        const result = categories.map(cat => ({
            ...cat,
            rules: rules.filter(r => r.categoryId === cat.id)
                .map(r => ({
                    ...r,
                    keywords: JSON.parse(r.keywords) // Parse JSON string back to array
                }))
        }))

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('Error fetching categories:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// Create new category
export async function POST(request: Request) {
    try {
        const d1 = await getD1Database()
        if (!d1) return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        const db = getDb(d1)

        const body = await request.json() as { name: string, order?: number }
        const { name, order } = body

        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

        const newCategory = await db.insert(systemCategories)
            .values({
                name,
                order: order || 0
            })
            .returning()
            .get()

        return NextResponse.json(newCategory)
    } catch (error: any) {
        console.error('Error creating category:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// Update category (PUT) or Rules (Separate endpoint usually, but maybe nested here? simpler to have /api/admin/categories/[id])
