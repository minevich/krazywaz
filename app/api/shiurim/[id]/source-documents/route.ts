import { NextRequest, NextResponse } from 'next/server'
import { getDb, getD1Database } from '@/lib/db'
import { sourceDocuments, shiurim, users } from '@/lib/schema'
import { cookies } from 'next/headers'
import { eq, asc } from 'drizzle-orm'

async function isAuthenticated(d1: D1Database) {
  const cookieStore = await cookies()
  const session = cookieStore.get('admin-session')
  if (!session) return false

  const db = getDb(d1)
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, session.value))
    .get()

  return !!user
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const d1 = await getD1Database()

    if (!d1) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    const db = getDb(d1)

    const docs = await db
      .select()
      .from(sourceDocuments)
      .where(eq(sourceDocuments.shiurId, id))
      .orderBy(asc(sourceDocuments.position))
      .all()

    return NextResponse.json(docs)
  } catch (error) {
    console.error('Error fetching source documents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const d1 = await getD1Database()

    if (!d1) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    if (!(await isAuthenticated(d1))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as {
      documents: Array<{
        id?: string
        url: string
        type: 'pdf' | 'image'
        label?: string | null
        position: number
      }>
    }

    const db = getDb(d1)

    // Delete existing docs for this shiur
    await db.delete(sourceDocuments).where(eq(sourceDocuments.shiurId, id)).execute()

    // Insert new docs
    if (body.documents && body.documents.length > 0) {
      for (const doc of body.documents) {
        await db.insert(sourceDocuments).values({
          id: doc.id || crypto.randomUUID(),
          shiurId: id,
          url: doc.url,
          type: doc.type,
          label: doc.label || null,
          position: doc.position,
          createdAt: new Date(),
        }).execute()
      }
    }

    // Clear legacy sourceDoc field
    await db
      .update(shiurim)
      .set({ sourceDoc: null })
      .where(eq(shiurim.id, id))
      .execute()

    // Return updated list
    const docs = await db
      .select()
      .from(sourceDocuments)
      .where(eq(sourceDocuments.shiurId, id))
      .orderBy(asc(sourceDocuments.position))
      .all()

    return NextResponse.json(docs)
  } catch (error) {
    console.error('Error updating source documents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
