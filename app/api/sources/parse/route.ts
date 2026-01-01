import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''
const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY || 'AIzaSyAXKKKN7H5WmZjQXipg7ghBQHkIxhVyWN0'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size)

        const bytes = await file.arrayBuffer()
        const base64Image = Buffer.from(bytes).toString('base64')

        let mimeType = file.type
        // Claude supports: image/png, image/jpeg, image/gif, image/webp, application/pdf
        if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') {
            mimeType = 'image/png'
        }

        // Use Claude Vision for best results
        if (ANTHROPIC_API_KEY) {
            console.log('Using Claude Vision for Hebrew source parsing...')
            const claudeResult = await parseWithClaude(base64Image, mimeType)

            if (claudeResult.sources.length > 0) {
                return NextResponse.json({
                    success: true,
                    rawText: claudeResult.rawText,
                    sources: claudeResult.sources,
                    method: 'claude_vision'
                })
            }
            console.log('Claude returned no sources, trying Google Vision...')
        }

        // Fallback to Google Vision
        console.log('Using Google Vision OCR...')
        const buffer = Buffer.from(bytes)
        const rawText = await ocrWithGoogleVision(buffer, file.type)

        if (rawText.length < 10) {
            return NextResponse.json({
                success: true,
                rawText: '',
                sources: [],
                method: 'google_vision',
                note: 'No text found'
            })
        }

        const sources = simpleParseText(rawText)

        return NextResponse.json({
            success: true,
            rawText,
            sources,
            method: 'google_vision'
        })
    } catch (error) {
        console.error('Processing error:', error)
        return NextResponse.json({
            error: 'Failed to process file: ' + (error as Error).message
        }, { status: 500 })
    }
}

async function parseWithClaude(base64Image: string, mimeType: string): Promise<{ rawText: string; sources: Array<{ id: string; text: string; type: string; title?: string }> }> {
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 8000,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: mimeType,
                                data: base64Image
                            }
                        },
                        {
                            type: 'text',
                            text: `You are an expert in Jewish religious texts. Look at this image of a Hebrew source sheet.

READ all the Hebrew/Aramaic text carefully (including Rashi script if present).
IDENTIFY each individual source - there may be 5, 10, 20, or 40+ sources.
For each source, determine its reference (e.g., "רש"י בראשית א:א", "גמרא ברכות ב.").

Return a JSON object:
{
  "rawText": "All extracted text...",
  "sources": [
    {"title": "Source reference", "text": "Full source content", "type": "hebrew"}
  ]
}

Extract ALL text, include EVERY source. Return ONLY valid JSON.`
                        }
                    ]
                }]
            })
        })

        if (!response.ok) {
            const errText = await response.text()
            console.error('Claude API error:', response.status, errText)
            return { rawText: '', sources: [] }
        }

        const data = await response.json() as any
        const content = data.content?.[0]?.text || ''

        console.log('Claude response length:', content.length)

        let jsonStr = content.trim()
        if (jsonStr.includes('```')) {
            const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
            if (match) jsonStr = match[1].trim()
        }

        const parsed = JSON.parse(jsonStr)

        return {
            rawText: parsed.rawText || '',
            sources: (parsed.sources || []).map((s: any) => ({
                id: crypto.randomUUID(),
                title: s.title || 'Source',
                text: s.text || '',
                type: s.type || 'hebrew'
            }))
        }
    } catch (e) {
        console.error('Claude parsing error:', e)
        return { rawText: '', sources: [] }
    }
}

function simpleParseText(text: string): Array<{ id: string; text: string; type: string; title?: string }> {
    const blocks = text.split(/\n{2,}/).map(b => b.trim()).filter(b => b.length > 20)

    return blocks.map((block, i) => {
        const lines = block.split('\n')
        const firstLine = lines[0].trim()
        const hebrewChars = (block.match(/[\u0590-\u05FF]/g) || []).length
        const isHebrew = hebrewChars > block.length * 0.3

        return {
            id: crypto.randomUUID(),
            text: block,
            type: isHebrew ? 'hebrew' : 'english',
            title: firstLine.length < 60 ? firstLine : `Source ${i + 1}`
        }
    })
}

async function ocrWithGoogleVision(buffer: Buffer, mimeType: string): Promise<string> {
    const base64Content = buffer.toString('base64')

    const requestBody = {
        requests: [
            {
                image: { content: base64Content },
                features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
                imageContext: { languageHints: ['he', 'en', 'yi'] }
            }
        ]
    }

    const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        }
    )

    const data = await response.json() as any
    return data.responses?.[0]?.fullTextAnnotation?.text || ''
}
