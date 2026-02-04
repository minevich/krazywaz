import { NextResponse } from 'next/server'



export async function POST(req: Request) {
    try {
        const body = await req.json() as any
        const { name, email, message, phone, subject, shiur } = body

        // 1. Basic Validation
        if (!name || !email || !message) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // 2. Forward to Google Apps Script
        // Ideally this URL is in process.env.GOOGLE_SCRIPT_URL
        // But for now we will hardcode the user's script URL once they provide it
        // or use a placeholder they can replace.
        const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL

        if (!GOOGLE_SCRIPT_URL) {
            console.error('GOOGLE_SCRIPT_URL is not defined')
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            )
        }

        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                name,
                email,
                message,
                phone: phone || '',
                subject: subject || '',
                shiur: shiur || ''
            }),
            headers: { 'Content-Type': 'application/json' },
        })

        const data = await response.json() as any

        if (data.status === 'success') {
            return NextResponse.json({ success: true })
        } else {
            throw new Error(data.message || 'Google Script Error')
        }

    } catch (error) {
        console.error('Contact API Error:', error)
        return NextResponse.json(
            { error: 'Failed to send message' },
            { status: 500 }
        )
    }
}
