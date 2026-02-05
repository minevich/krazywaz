import { NextResponse } from 'next/server'
import { getD1Database, getDb } from '@/lib/db'
import { systemCategories } from '@/lib/schema'
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

        const body = await request.json() as { name?: string, order?: number, isHidden?: boolean }
        const { name, order, isHidden } = body

        await db.update(systemCategories)
            .set({
                ...(name && { name }),
                ...(order !== undefined && { order }),
                ...(isHidden !== undefined && { isHidden }),
                updatedAt: new Date()
            })
            .where(eq(systemCategories.id, id))
            .execute()

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error updating category:', error)
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

        await db.delete(systemCategories)
            .where(eq(systemCategories.id, id))
            .execute()

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting category:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
