import { NextRequest, NextResponse } from 'next/server'

// Use Gemini to IDENTIFY the source directly (Option 3)
// Gemini knows Torah texts and can often recognize sources without external search
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

interface GeminiResponse {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string
            }>
        }
    }>
}

export async function POST(request: NextRequest) {
    if (!GEMINI_API_KEY) {
        return NextResponse.json({ success: false, error: 'GEMINI_API_KEY not configured' })
    }

    try {
        const formData = await request.formData()
        const imageFile = formData.get('image') as File

        if (!imageFile) {
            return NextResponse.json({ success: false, error: 'No image provided' })
        }

        console.log('--- Identifying source with Gemini Vision ---')

        // Convert to base64
        const arrayBuffer = await imageFile.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const mimeType = imageFile.type || 'image/png'

        // Call Gemini with vision capability
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                text: `You are an expert in Torah, Talmud, and Jewish texts. Analyze this image of Hebrew/Aramaic text.

Your task:
1. READ the text in the image carefully
2. IDENTIFY what source this is from (Gemara, Mishnah, Rashi, Tosafot, Rambam, Shulchan Aruch, etc.)
3. Provide the EXACT reference (e.g., "Berakhot 2a", "Rashi on Genesis 1:1", "Mishneh Torah Hilchot Shabbat 1:1")

Return ONLY a JSON object:
{
  "candidates": [
    {
      "sourceName": "Human readable name (e.g. 'Rashi on Bereishit 1:1')",
      "sefariaRef": "Sefaria-compatible reference (e.g. 'Rashi on Genesis 1:1')",
      "previewText": "First few words of the Hebrew text you see"
    }
  ]
}

If you can identify multiple possible sources (e.g., if unsure), return up to 3 candidates.
If you cannot identify the source at all, return {"candidates": []}.
Return ONLY valid JSON, no markdown.`
                            },
                            {
                                inlineData: {
                                    mimeType,
                                    data: base64
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 1024
                    }
                })
            }
        )

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text()
            console.error('Gemini API Error:', errorText)
            return NextResponse.json({ success: false, error: `Gemini API Error: ${geminiResponse.status}` })
        }

        const geminiData = await geminiResponse.json() as GeminiResponse
        const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

        console.log('Gemini Response:', responseText.substring(0, 200))

        // Parse JSON response
        let result = { candidates: [] as any[] }
        try {
            // Clean up response (remove markdown code blocks if present)
            let jsonStr = responseText
                .replace(/```json\s*/g, '')
                .replace(/```\s*/g, '')
                .trim()

            result = JSON.parse(jsonStr)
        } catch (e) {
            console.error('JSON Parse Error:', e, 'Response:', responseText)
            // Try to extract JSON object from response
            const match = responseText.match(/\{[\s\S]*\}/)
            if (match) {
                try {
                    result = JSON.parse(match[0])
                } catch { }
            }
        }

        const candidates = result.candidates || []
        console.log(`Found ${candidates.length} candidates`)

        return NextResponse.json({
            success: true,
            candidates
        })

    } catch (error) {
        console.error('Identification Error:', error)
        return NextResponse.json({
            success: false,
            error: String(error)
        })
    }
}
