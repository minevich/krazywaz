import { NextRequest, NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBUxKm7aHk1erGj3CPL-Xab8UXSZAWe5IU'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { text?: string }
        const text = body.text

        if (!text || text.length < 10) {
            return NextResponse.json({ error: 'No text provided' }, { status: 400 })
        }

        console.log('Parsing text with Gemini AI...', text.length, 'characters')

        const sources = await parseTextWithGemini(text)

        return NextResponse.json({
            success: true,
            sources,
            method: 'gemini_text_parsing'
        })
    } catch (error) {
        console.error('Text parsing error:', error)
        return NextResponse.json({
            error: 'Failed to parse text: ' + (error as Error).message
        }, { status: 500 })
    }
}

async function parseTextWithGemini(text: string): Promise<Array<{ id: string; text: string; type: string; title?: string }>> {
    try {
        const prompt = `You are an expert in Jewish religious texts (Torah, Talmud, Midrash, Halacha, etc.)

Analyze this Hebrew source sheet text and identify EACH INDIVIDUAL SOURCE.

The text contains multiple sources - could be 5, 10, 20, or even 40+ sources. Your job is to:
1. Identify where each source begins and ends
2. Determine the source reference/title (e.g., "רש"י בראשית א:א", "גמרא ברכות ב.", "רמב"ם הל' תשובה פ"א")
3. Extract the full text of each source

For EACH source found, provide:
- title: The source reference/citation as it appears OR your best identification
- text: The complete content of that source
- type: "hebrew" for Hebrew/Aramaic, "english" for English

IMPORTANT RULES:
1. Find ALL sources - don't stop at 5 or 10 if there are more
2. Sources are typically separated by headers, numbers (1, 2, 3 or א, ב, ג), or clear visual breaks
3. Look for common source indicators: רש"י, תוספות, גמרא, משנה, רמב"ם, שו"ע, מדרש, etc.
4. If a source has no clear reference, describe it (e.g., "פירוש על הפסוק", "הערה")
5. Keep the original Hebrew text exactly as written

Return ONLY a valid JSON array with this format:
[
  {"title": "רש\"י בראשית א:א", "text": "בראשית - בשביל התורה שנקראת ראשית...", "type": "hebrew"},
  {"title": "Source 2 Title", "text": "Source 2 content...", "type": "hebrew"}
]

Here is the source sheet text to parse:

${text.substring(0, 15000)}`

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 8000
                    }
                })
            }
        )

        if (!response.ok) {
            const errText = await response.text()
            console.error('Gemini API error:', response.status, errText)
            // Fallback to simple parsing
            return simpleParse(text)
        }

        const data = await response.json() as any
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

        console.log('Gemini response length:', content.length)

        // Extract JSON from response
        let jsonStr = content.trim()

        // Handle markdown code blocks
        if (jsonStr.includes('```')) {
            const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
            if (match) {
                jsonStr = match[1].trim()
            }
        }

        try {
            const parsed = JSON.parse(jsonStr)

            if (!Array.isArray(parsed) || parsed.length === 0) {
                console.log('Gemini returned empty/invalid, using fallback')
                return simpleParse(text)
            }

            return parsed.map((s: any) => ({
                id: crypto.randomUUID(),
                title: s.title || 'Source',
                text: s.text || '',
                type: s.type || 'hebrew'
            }))
        } catch (parseErr) {
            console.error('JSON parse error:', parseErr)
            return simpleParse(text)
        }
    } catch (e) {
        console.error('Gemini parsing error:', e)
        return simpleParse(text)
    }
}

// Simple fallback parsing
function simpleParse(text: string): Array<{ id: string; text: string; type: string; title?: string }> {
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
