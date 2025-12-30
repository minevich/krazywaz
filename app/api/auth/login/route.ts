import { NextRequest, NextResponse } from 'next/server'
import { verifyUser } from '@/lib/auth'
import { cookies } from 'next/headers'
import { getD1Database } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Get D1 database using OpenNext's getCloudflareContext
    const db = await getD1Database()

    if (!db) {
      console.error('D1 database not available')
      return NextResponse.json(
        { error: 'Database not configured.' },
        { status: 500 }
      )
    }

    const body = await request.json() as { email: string; password: string }
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const user = await verifyUser(db, email, password)

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Set a simple session cookie
    const cookieStore = await cookies()
    cookieStore.set('admin-session', user.id, {
      httpOnly: true,
      secure: true, // Always secure in Workers
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name }
    })
  } catch (error: any) {
    console.error('Login error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('admin-session')
  return NextResponse.json({ success: true })
}
