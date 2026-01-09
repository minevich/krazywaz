import { NextRequest, NextResponse } from 'next/server'

// Multiple API keys to try - different keys may have access to different models
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAEXa4oYvoHXYUqRq-8UTEOUd9mQd-Va8I'
const GEMINI_API_KEY_ALT = 'AIzaSyBUxKm7aHk1erGj3CPL-Xab8UXSZAWe5IU'  // From parse-text route
const GOOGLE_CLOUD_API_KEY = process.env.GOOGLE_CLOUD_API_KEY || 'AIzaSyAXKKKN7H5WmZjQXipg7ghBQHkIxhVyWN0'

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

        // Convert to base64
        const arrayBuffer = await imageFile.arrayBuffer()
        const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        )
        const mimeType = imageFile.type || 'image/png'

        const candidates: Array<{ sourceName: string, sefariaRef: string, previewText: string, source?: string }> = []

        // ============================================
        // STRATEGY 1: Try Gemini models (correct names)
        // ============================================

        // Official model names from Google docs + API keys to try
        const models = [
            'gemini-2.0-flash',       // Latest stable 2.0
            'gemini-2.0-flash-001',   // Stable version  
            'gemini-2.0-flash-exp',   // Experimental
        ]

        const apiKeys = [GEMINI_API_KEY, GEMINI_API_KEY_ALT]

        for (const apiKey of apiKeys) {
            if (candidates.length > 0) break

            for (const model of models) {
                if (candidates.length > 0) break

                debugLog.push(`Trying ${model}...`)
                try {
                    const geminiResponse = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{
                                    parts: [
                                        {
                                            text: `Identify this Hebrew/Aramaic Torah source. Return ONLY JSON:
{"candidates":[{"sourceName":"Name","sefariaRef":"Ref","previewText":"First words"}]}
Examples: "Berakhot 55a", "Rashi on Genesis 1:1"`
                                        },
                                        { inlineData: { mimeType, data: base64 } }
                                    ]
                                }],
                                generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
                            })
                        }
                    )

                    debugLog.push(`${model}: ${geminiResponse.status}`)

                    if (geminiResponse.status === 429 || geminiResponse.status === 404) {
                        continue
                    }

                    if (geminiResponse.ok) {
                        const geminiData: GeminiResponse = await geminiResponse.json()
                        const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

                        try {
                            const match = responseText.match(/\{[\s\S]*\}/)
                            if (match) {
                                const result = JSON.parse(match[0])
                                if (result.candidates?.length > 0) {
                                    for (const c of result.candidates) {
                                        candidates.push({
                                            sourceName: c.sourceName || c.sefariaRef || 'Unknown',
                                            sefariaRef: c.sefariaRef || '',
                                            previewText: c.previewText || '',
                                            source: `Gemini`
                                        })
                                    }
                                    debugLog.push(`Gemini found ${candidates.length} candidates`)
                                }
                            }
                        } catch (e) {
                            debugLog.push(`Parse error`)
                        }
                    }
                } catch (e) {
                    debugLog.push(`Error: ${e}`)
                }
            }
        }

        if (candidates.length > 0) {
            return NextResponse.json({ success: true, candidates, debug: debugLog })
        }

        // ============================================
        // STRATEGY 2: OCR with Vision API + Sefaria find-refs
        // ============================================

        debugLog.push('Gemini failed, trying OCR + Sefaria...')

        // Step 1: OCR with Google Vision
        let ocrText = ''
        try {
            const visionRes = await fetch(
                `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CLOUD_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        requests: [{
                            image: { content: base64 },
                            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
                        }]
                    })
                }
            )

            debugLog.push(`Vision: ${visionRes.status}`)

            if (visionRes.ok) {
                const visionData = await visionRes.json() as any
                ocrText = visionData.responses?.[0]?.fullTextAnnotation?.text || ''
                debugLog.push(`OCR: ${ocrText.length} chars`)
            }
        } catch (e) {
            debugLog.push(`Vision error: ${e}`)
        }

        if (!ocrText) {
            return NextResponse.json({
                success: false,
                error: 'Could not read text from image',
                debug: debugLog
            })
        }

        // Clean the OCR text - remove nikkud, keep only Hebrew
        const cleanText = ocrText
            .replace(/[\u0591-\u05C7]/g, '')  // Remove nikkud
            .replace(/[^\u05D0-\u05EA\s]/g, ' ')  // Keep only Hebrew letters
            .replace(/\s+/g, ' ')
            .trim()

        // Step 2: Call Sefaria find-refs API (POST with JSON)
        // Step 2: Try Sefaria APIs

        // Strategy A: Try find-refs with correct body format
        try {
            debugLog.push('Trying Sefaria find-refs...')

            const sefariaRes = await fetch('https://www.sefaria.org/api/find-refs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: {
                        body: cleanText.substring(0, 1000),
                        title: ''
                    },
                    lang: 'he'
                }),
                signal: AbortSignal.timeout(15000)
            })

            debugLog.push(`find-refs: ${sefariaRes.status}`)

            if (sefariaRes.ok) {
                const data = await sefariaRes.json() as any
                debugLog.push(`Keys: ${Object.keys(data).join(', ')}`)

                // Handle async response - might return task_id
                if (data.task_id) {
                    debugLog.push('Async task, skipping...')
                } else {
                    const refs = data.ref_data || data.refs || data.results || []
                    if (Array.isArray(refs) && refs.length > 0) {
                        for (const item of refs.slice(0, 5)) {
                            const ref = typeof item === 'string' ? item : (item.ref || '')
                            if (ref) {
                                candidates.push({
                                    sourceName: ref.replace(/_/g, ' '),
                                    sefariaRef: ref,
                                    previewText: cleanText.substring(0, 80),
                                    source: 'Sefaria'
                                })
                            }
                        }
                    }
                }
            }
        } catch (e) {
            debugLog.push(`find-refs error: ${e}`)
        }

        // Strategy B: Try name API to match text patterns
        if (candidates.length === 0) {
            try {
                // Extract first few significant Hebrew words for lookup
                const words = cleanText.split(' ').filter((w: string) => w.length > 2).slice(0, 3)
                const searchTerm = words.join(' ')

                debugLog.push(`Trying name API: ${searchTerm.substring(0, 30)}...`)

                const nameRes = await fetch(
                    `https://www.sefaria.org/api/name/${encodeURIComponent(searchTerm)}?limit=5`,
                    { signal: AbortSignal.timeout(10000) }
                )

                debugLog.push(`name API: ${nameRes.status}`)

                if (nameRes.ok) {
                    const nameData = await nameRes.json() as any

                    // Check if it's a valid ref
                    if (nameData.is_ref && nameData.ref) {
                        candidates.push({
                            sourceName: nameData.ref,
                            sefariaRef: nameData.ref,
                            previewText: cleanText.substring(0, 80),
                            source: 'Sefaria Match'
                        })
                    }
                }
            } catch (e) {
                debugLog.push(`name API error: ${e}`)
            }
        }

        // Return results
        if (candidates.length > 0) {
            return NextResponse.json({ success: true, candidates, debug: debugLog })
        }

        // No results - return OCR text for manual identification
        return NextResponse.json({
            success: false,
            error: 'No sources identified',
            candidates: [{
                sourceName: 'OCR Text (manual identification needed)',
                sefariaRef: '',
                previewText: cleanText.substring(0, 200),
                source: 'OCR'
            }],
            ocrText: cleanText.substring(0, 300),
            debug: debugLog
        })

    } catch (error) {
        debugLog.push(`Fatal: ${error}`)
        return NextResponse.json({ success: false, error: String(error), debug: debugLog })
    }
}
