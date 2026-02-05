import { NextResponse } from 'next/server'
import { getD1Database, getDb } from '@/lib/db'
import { systemCategoryRules } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const d1 = await getD1Database()
        if (!d1) return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        const db = getDb(d1)
        const { id } = await params

        const body = await request.json() as { name?: string, keywords?: string[], order?: number, categoryId?: string }
        const { name, keywords, order, categoryId } = body

        await db.update(systemCategoryRules)
            .set({
                ...(name && { name }),
                ...(keywords && { keywords: JSON.stringify(keywords) }),
                ...(order !== undefined && { order }),
                ...(categoryId && { categoryId }),
                updatedAt: new Date()
            })
            .where(eq(systemCategoryRules.id, id))
            .execute()

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error updating rule:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const d1 = await getD1Database()
        if (!d1) return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        const db = getDb(d1)
        const { id } = await params

        await db.delete(systemCategoryRules)
            .where(eq(systemCategoryRules.id, id))
            .execute()

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting rule:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
