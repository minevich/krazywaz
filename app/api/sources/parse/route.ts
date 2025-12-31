import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('pdf') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // For edge runtime, we'll extract text differently
        // We'll use a simple approach for now - the client will handle more complex parsing
        const text = await extractTextFromPdf(buffer)

        // Parse the text into individual sources
        const sources = parseSourcesFromText(text)

        return NextResponse.json({
            success: true,
            rawText: text,
            sources
        })
    } catch (error) {
        console.error('PDF processing error:', error)
        return NextResponse.json({ error: 'Failed to process PDF' }, { status: 500 })
    }
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
    // Simple text extraction - looks for text streams in PDF
    const pdfString = buffer.toString('latin1')

    // Extract text between BT and ET markers (text blocks in PDF)
    const textBlocks: string[] = []
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g
    let match

    while ((match = streamRegex.exec(pdfString)) !== null) {
        const stream = match[1]
        // Look for text operators
        const textRegex = /\((.*?)\)Tj|\[(.*?)\]TJ/g
        let textMatch
        while ((textMatch = textRegex.exec(stream)) !== null) {
            const text = textMatch[1] || textMatch[2]
            if (text) {
                // Decode common escape sequences
                const decoded = text
                    .replace(/\\n/g, '\n')
                    .replace(/\\r/g, '\r')
                    .replace(/\\t/g, '\t')
                    .replace(/\\\(/g, '(')
                    .replace(/\\\)/g, ')')
                    .replace(/\\\\/g, '\\')
                textBlocks.push(decoded)
            }
        }
    }

    return textBlocks.join(' ').trim()
}

function parseSourcesFromText(text: string): Array<{ id: string; text: string; type: string }> {
    if (!text.trim()) return []

    // Split by common source delimiters
    // Look for patterns like numbered lists, Hebrew letters, or double newlines
    const sources: Array<{ id: string; text: string; type: string }> = []

    // Split by double newlines or numbered patterns
    const blocks = text.split(/\n\s*\n|(?=\d+\.\s)|(?=[א-ת][\.\)])/g)
        .map(b => b.trim())
        .filter(b => b.length > 20) // Filter out very short fragments

    blocks.forEach((block, index) => {
        // Try to detect if this is Hebrew or English
        const hebrewChars = (block.match(/[\u0590-\u05FF]/g) || []).length
        const totalChars = block.length
        const isHebrew = hebrewChars / totalChars > 0.3

        sources.push({
            id: crypto.randomUUID(),
            text: block,
            type: isHebrew ? 'hebrew' : 'english'
        })
    })

    return sources
}
