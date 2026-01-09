import { NextRequest, NextResponse } from 'next/server'

// Fallback to known working key if env not set in Cloudflare
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAEXa4oYvoHXYUqRq-8UTEOUd9mQd-Va8I'

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
        // Try multiple Gemini models with correct names
        // ============================================

        const models = [
            'gemini-2.0-flash-exp',       // Experimental - this one worked before!
            'gemini-1.5-flash-latest',    // Latest stable flash
            'gemini-1.5-flash-002',       // Specific stable version
            'gemini-1.5-pro-latest',      // Pro latest
        ]

        if (GEMINI_API_KEY) {
            for (const model of models) {
                if (candidates.length > 0) break // Already found results

                debugLog.push(`Trying ${model}...`)
                try {
                    const geminiResponse = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{
                                    parts: [
                                        {
                                            text: `Identify this Hebrew/Aramaic Torah source. Return ONLY JSON:
{"candidates":[{"sourceName":"Name","sefariaRef":"Ref like Berakhot 55a","previewText":"First words"}]}

Examples: "Berakhot 55a", "Rashi on Genesis 1:1", "Shulchan Arukh, Orach Chayim 1:1"`
                                        },
                                        {
                                            inlineData: { mimeType, data: base64 }
                                        }
                                    ]
                                }],
                                generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
                            })
                        }
                    )

                    debugLog.push(`${model}: ${geminiResponse.status}`)

                    // If rate limited or not found, try next model
                    if (geminiResponse.status === 429 || geminiResponse.status === 404) {
                        continue
                    }

                    if (geminiResponse.ok) {
                        const geminiData: GeminiResponse = await geminiResponse.json()
                        const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
                        debugLog.push(`Response: ${responseText.substring(0, 100)}`)

                        try {
                            let jsonStr = responseText
                            const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/)
                            if (jsonMatch) {
                                jsonStr = jsonMatch[1]
                            } else {
                                const plainMatch = responseText.match(/\{[\s\S]*\}/)
                                if (plainMatch) jsonStr = plainMatch[0]
                            }

                            const result = JSON.parse(jsonStr)
                            if (result.candidates?.length > 0) {
                                for (const c of result.candidates) {
                                    candidates.push({
                                        sourceName: c.sourceName || c.sefariaRef || 'Unknown',
                                        sefariaRef: c.sefariaRef || '',
                                        previewText: c.previewText || '',
                                        source: `Gemini (${model})`
                                    })
                                }
                                debugLog.push(`Found ${candidates.length} candidates`)
                            }
                        } catch (e) {
                            debugLog.push(`Parse error: ${e}`)
                        }
                    } else {
                        const errText = await geminiResponse.text()
                        debugLog.push(`Error: ${errText.substring(0, 100)}`)
                    }
                } catch (e) {
                    debugLog.push(`Fetch error: ${e}`)
                }
            }
        } else {
            debugLog.push('No GEMINI_API_KEY')
        }

        if (candidates.length > 0) {
            return NextResponse.json({ success: true, candidates, debug: debugLog })
        }

        return NextResponse.json({
            success: false,
            error: 'Could not identify source (all models failed or rate limited)',
            candidates: [],
            debug: debugLog
        })

    } catch (error) {
        debugLog.push(`Fatal: ${error}`)
        return NextResponse.json({ success: false, error: String(error), debug: debugLog })
    }
}
