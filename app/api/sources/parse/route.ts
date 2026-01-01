import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBUxKm7aHk1erGj3CPL-Xab8UXSZAWe5IU'
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
        const base64Data = Buffer.from(bytes).toString('base64')

        let mimeType = file.type
        if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') {
            mimeType = 'image/png'
        }

        // Use Gemini Vision for parsing (FREE!)
        console.log('Using Gemini Vision for Hebrew source parsing...')
        const result = await parseWithGemini(base64Data, mimeType)

        if (result.sources.length > 0) {
            return NextResponse.json({
                success: true,
                rawText: result.rawText,
                sources: result.sources,
                method: 'gemini_vision'
            })
        }

        // Fallback to Google Vision OCR
        console.log('Gemini returned no sources, trying Google Vision OCR...')
        const buffer = Buffer.from(bytes)
        const rawText = await ocrWithGoogleVision(buffer, file.type)

        if (rawText.length < 10) {
            return NextResponse.json({
                success: true,
                rawText: result.rawText || 'No text extracted',
                sources: [],
                method: 'failed'
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
            error: 'Failed: ' + (error as Error).message
        }, { status: 500 })
    }
}

async function parseWithGemini(base64Data: string, mimeType: string): Promise<{ rawText: string; sources: Array<{ id: string; text: string; type: string; title?: string }> }> {
    try {
        const prompt = `You are an expert in Jewish religious texts. Look at this document and extract ALL Hebrew sources.

For each source you find:
1. Identify its reference (e.g., "רש"י בראשית א:א", "גמרא ברכות ב.")
2. Extract the complete text content
3. Note if it's Hebrew or English

Return a JSON object:
{
  "rawText": "All text from the document...",
  "sources": [
    {"title": "Source reference", "text": "Full text content", "type": "hebrew"},
    ...more sources...
  ]
}

Include ALL sources - there may be 5, 10, 20, or 40+ sources.
Return ONLY valid JSON, no other text.`

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inline_data: { mime_type: mimeType, data: base64Data } }
                        ]
                    }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 8000 }
                })
            }
        )

        if (!response.ok) {
            const errText = await response.text()
            console.error('Gemini API error:', response.status, errText)
            return { rawText: `Gemini Error: ${response.status}`, sources: [] }
        }

        const data = await response.json() as any
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

        console.log('Gemini response length:', content.length)

        if (!content) {
            return { rawText: 'Gemini returned empty', sources: [] }
        }

        // Extract JSON
        let jsonStr = content.trim()
        if (jsonStr.includes('```')) {
            const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
            if (match) jsonStr = match[1].trim()
        }

        try {
            const parsed = JSON.parse(jsonStr)
            return {
                rawText: parsed.rawText || content,
                sources: (parsed.sources || []).map((s: any) => ({
                    id: crypto.randomUUID(),
                    title: s.title || 'Source',
                    text: s.text || '',
                    type: s.type || 'hebrew'
                }))
            }
        } catch {
            // If JSON parse fails, return raw content as single source
            return {
                rawText: content,
                sources: [{
                    id: crypto.randomUUID(),
                    title: 'Extracted Text',
                    text: content,
                    type: 'hebrew'
                }]
            }
        }
    } catch (e) {
        console.error('Gemini error:', e)
        return { rawText: `Error: ${(e as Error).message}`, sources: [] }
    }
}

function simpleParseText(text: string): Array<{ id: string; text: string; type: string; title?: string }> {
    const blocks = text.split(/\n{2,}/).map(b => b.trim()).filter(b => b.length > 20)

    return blocks.map((block, i) => {
        const firstLine = block.split('\n')[0].trim()
        const hebrewChars = (block.match(/[\u0590-\u05FF]/g) || []).length

        return {
            id: crypto.randomUUID(),
            text: block,
            type: hebrewChars > block.length * 0.3 ? 'hebrew' : 'english',
            title: firstLine.length < 60 ? firstLine : `Source ${i + 1}`
        }
    })
}

async function ocrWithGoogleVision(buffer: Buffer, mimeType: string): Promise<string> {
    const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requests: [{
                    image: { content: buffer.toString('base64') },
                    features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
                    imageContext: { languageHints: ['he', 'en'] }
                }]
            })
        }
    )

    const data = await response.json() as any
    return data.responses?.[0]?.fullTextAnnotation?.text || ''
}
