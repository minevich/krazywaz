import { notFound, redirect } from 'next/navigation'
import { getDb, getD1Database } from '@/lib/db'
import { shiurim } from '@/lib/schema'
import { eq } from 'drizzle-orm'

// Mark as dynamic to avoid build-time database access
export const dynamic = 'force-dynamic'

export default async function SlugPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params

    const d1 = await getD1Database()

    if (!d1) {
        notFound()
    }

    const db = getDb(d1)

    // Find shiur by slug
    const shiur = await db
        .select({ id: shiurim.id })
        .from(shiurim)
        .where(eq(shiurim.slug, slug))
        .get()

    if (!shiur) {
        notFound()
    }

    // Redirect to the main shiur page
    redirect(`/shiur/${shiur.id}`)
}
