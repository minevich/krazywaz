import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file' }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const base64 = Buffer.from(bytes).toString('base64')
        const mimeType = file.type.startsWith('image/') ? file.type : 'image/png'

        // Try Gemini to find source markers
        let regions = await findSourceMarkers(base64, mimeType)

        // If failed, default to one full-page source
        if (!regions || regions.length === 0) {
            regions = [{ title: 'Source 1', box_2d: [0, 0, 1000, 1000] }]
        }

        return NextResponse.json({
            success: true,
            image: `data:${mimeType};base64,${base64}`,
            regions
        })
    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}

async function findSourceMarkers(base64: string, mimeType: string) {
    if (!GEMINI_API_KEY) {
        return []
    }

    // Super detailed prompt focusing on finding NUMBER MARKERS
    const prompt = `You are an expert at analyzing Jewish Torah source sheet scans.

CAREFUL OBSERVATION REQUIRED:
Look at this image VERY carefully. Find EVERY distinct source citation.
Sources are marked by:
- Handwritten or printed NUMBERS in circles or parentheses: ①②③ or (1)(2)(3) or just 1. 2. 3.
- Hebrew letters as markers: א׳ ב׳ ג׳
- Bold section headers like "רש"י" or "גמרא"
- Clear paragraph breaks with whitespace

YOUR TASK:
For EACH source you find, give me its bounding box coordinates.
The coordinates are [top, left, bottom, right] as percentages 0-1000 where:
- 0,0 is top-left corner
- 1000,1000 is bottom-right corner

IMPORTANT:
- Sources may be in MULTIPLE COLUMNS (side by side)
- Sources may be DIFFERENT SIZES
- Count ALL sources, even small ones
- Be VERY precise with the boundaries

Return a JSON array with EVERY source:
[
  {"label": "1", "box": [top, left, bottom, right]},
  {"label": "2", "box": [top, left, bottom, right]},
  ...
]

If you see 9 sources, return 9 objects.
Return ONLY the JSON array, no other text.`

    try {
        const res = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-goog-api-key': GEMINI_API_KEY
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inline_data: { mime_type: mimeType, data: base64 } }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1
                    }
                })
            }
        )

        if (!res.ok) {
            console.error('Gemini error:', res.status)
            return []
        }

        const data = await res.json() as any
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'

        console.log('Gemini response:', text.substring(0, 500))

        // Clean up response
        if (text.includes('```')) {
            const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
            if (match) text = match[1]
        }
        text = text.trim()
        if (!text.startsWith('[')) {
            const arrayStart = text.indexOf('[')
            if (arrayStart !== -1) text = text.substring(arrayStart)
        }

        const sources = JSON.parse(text)

        // Convert to our format
        return sources.map((s: any, i: number) => ({
            title: s.label || `Source ${i + 1}`,
            box_2d: s.box || [0, 0, 1000, 1000]
        }))

    } catch (e) {
        console.error('Gemini parse error:', e)
        return []
    }
}
