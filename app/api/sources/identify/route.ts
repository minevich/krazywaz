import { NextRequest, NextResponse } from 'next/server'

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
    const debugLog: string[] = []

    try {
        const formData = await request.formData()
        const imageFile = formData.get('image') as File

        if (!imageFile) {
            return NextResponse.json({ success: false, error: 'No image provided' })
        }

        // Convert to base64 - SAME METHOD AS WORKING ANALYZE ROUTE
        const arrayBuffer = await imageFile.arrayBuffer()
        const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        )
        const mimeType = imageFile.type || 'image/png'

        const candidates: Array<{ sourceName: string, sefariaRef: string, previewText: string, source?: string }> = []

        // ============================================
        // STRATEGY 1: Try Gemini (SAME MODEL AS ANALYZE)
        // ============================================

        if (GEMINI_API_KEY) {
            debugLog.push('Trying Gemini 2.0 Flash Exp...')
            try {
                // Use EXACT same endpoint as working analyze route
                const geminiResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    {
                                        text: `Look at this Hebrew/Aramaic Torah text image and identify the source.

Analyze the text content and identify which Jewish text this is from. Consider:
- Talmud (Bavli/Yerushalmi)
- Mishnah
- Torah commentaries (Rashi, Tosafot, Ramban, etc.)
- Shulchan Aruch and commentaries
- Midrash
- Other Jewish texts

Return ONLY a JSON object with your best identification:
{"candidates":[{"sourceName":"Full readable name","sefariaRef":"Sefaria format ref","previewText":"First few words"}]}

Examples of sefariaRef format:
- "Berakhot 55a" (Talmud)
- "Rashi on Genesis 1:1" (Commentary)
- "Mishneh Torah, Sabbath 1:1" (Rambam)
- "Shulchan Arukh, Orach Chayim 1:1"

Give your best guess even if uncertain.`
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
                                maxOutputTokens: 2048
                            }
                        })
                    }
                )

                debugLog.push(`Gemini status: ${geminiResponse.status}`)

                if (geminiResponse.ok) {
                    const geminiData: GeminiResponse = await geminiResponse.json()
                    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
                    debugLog.push(`Gemini response: ${responseText.substring(0, 150)}`)

                    try {
                        // Extract JSON from response
                        let jsonStr = responseText
                        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/)
                        if (jsonMatch) {
                            jsonStr = jsonMatch[1]
                        } else {
                            const plainMatch = responseText.match(/\{[\s\S]*\}/)
                            if (plainMatch) {
                                jsonStr = plainMatch[0]
                            }
                        }

                        const result = JSON.parse(jsonStr)
                        if (result.candidates?.length > 0) {
                            for (const c of result.candidates) {
                                candidates.push({
                                    sourceName: c.sourceName || c.sefariaRef || 'Unknown',
                                    sefariaRef: c.sefariaRef || '',
                                    previewText: c.previewText || '',
                                    source: 'Gemini AI'
                                })
                            }
                            debugLog.push(`Gemini found ${candidates.length} candidates`)
                        }
                    } catch (e) {
                        debugLog.push(`Gemini parse error: ${e}`)
                    }
                } else {
                    const errText = await geminiResponse.text()
                    debugLog.push(`Gemini error: ${errText.substring(0, 200)}`)
                }
            } catch (e) {
                debugLog.push(`Gemini fetch error: ${e}`)
            }
        } else {
            debugLog.push('No GEMINI_API_KEY configured')
        }

        if (candidates.length > 0) {
            return NextResponse.json({ success: true, candidates, debug: debugLog })
        }

        // ============================================
        // STRATEGY 2: Return with debug info
        // ============================================

        return NextResponse.json({
            success: false,
            error: 'Could not identify source',
            candidates: [],
            debug: debugLog
        })

    } catch (error) {
        debugLog.push(`Fatal error: ${error}`)
        return NextResponse.json({ success: false, error: String(error), debug: debugLog })
    }
}
