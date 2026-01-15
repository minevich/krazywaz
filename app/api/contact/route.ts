import { NextRequest, NextResponse } from 'next/server'

interface ContactFormData {
    name: string
    email: string
    phone?: string
    subject: string
    shiur?: string
    message: string
}

// TODO: Replace with Cloudflare Email Worker when domain is configured
// For now, this just logs the contact form submission

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as ContactFormData
        const { name, email, phone, subject, shiur, message } = body

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return NextResponse.json(
                { error: 'Name, email, subject, and message are required' },
                { status: 400 }
            )
        }

        // Log for now (replace with actual email sending later)
        console.log('=== CONTACT FORM SUBMISSION ===')
        console.log('From:', name, `<${email}>`)
        console.log('Phone:', phone || 'Not provided')
        console.log('Subject:', subject)
        console.log('Related Shiur:', shiur || 'N/A')
        console.log('Message:', message)
        console.log('================================')

        // TODO: Implement Cloudflare Email Worker integration
        // When domain is set up, send email via:
        // 1. Cloudflare Email Workers (recommended)
        // 2. Or use a service like Resend/SendGrid

        // For now, return success to allow form testing
        return NextResponse.json({ success: true, message: 'Message received' })

    } catch (error) {
        console.error('Contact form error:', error)
        return NextResponse.json(
            { error: 'Failed to process message' },
            { status: 500 }
        )
    }
}
