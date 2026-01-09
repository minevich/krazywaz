import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_CLOUD_API_KEY = process.env.GOOGLE_CLOUD_API_KEY || 'AIzaSyAXKKKN7H5WmZjQXipg7ghBQHkIxhVyWN0'
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
    try {
        const formData = await request.formData()
        const imageFile = formData.get('image') as File

        if (!imageFile) {
            return NextResponse.json({ success: false, error: 'No image provided' })
        }

        const arrayBuffer = await imageFile.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')
        const mimeType = imageFile.type || 'image/png'

        const candidates: Array<{ sourceName: string, sefariaRef: string, previewText: string, source?: string }> = []

        // ============================================
        // STRATEGY 1: Try Gemini first
        // ============================================

        if (GEMINI_API_KEY) {
            try {
                console.log('Trying Gemini...')
                const geminiResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { text: `Identify this Hebrew/Aramaic Torah text. Return JSON: {"candidates":[{"sourceName":"Name","sefariaRef":"Ref like Berakhot 2a","previewText":"First words"}]}` },
                                    { inlineData: { mimeType, data: base64 } }
                                ]
                            }],
                            generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
                        })
                    }
                )

                if (geminiResponse.ok) {
                    const geminiData: GeminiResponse = await geminiResponse.json()
                    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
                    console.log('Gemini:', responseText.substring(0, 150))

                    try {
                        const match = responseText.match(/\{[\s\S]*\}/)
                        if (match) {
                            const result = JSON.parse(match[0])
                            if (result.candidates?.length > 0) {
                                for (const c of result.candidates) {
                                    candidates.push({
                                        sourceName: c.sourceName || c.sefariaRef,
                                        sefariaRef: c.sefariaRef || '',
                                        previewText: c.previewText || '',
                                        source: 'Gemini AI'
                                    })
                                }
                            }
                        }
                    } catch (e) {
                        console.error('Gemini parse error')
                    }
                }
            } catch (e) {
                console.error('Gemini error:', e)
            }
        }

        if (candidates.length > 0) {
            return NextResponse.json({ success: true, candidates })
        }

        // ============================================
        // STRATEGY 2: OCR + Sefaria Search (proper API)
        // ============================================

        console.log('Using OCR + Sefaria...')

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

        if (!visionRes.ok) {
            return NextResponse.json({ success: false, error: `Vision API Error: ${visionRes.status}` })
        }

        const visionData = await visionRes.json() as any
        const fullText = visionData.responses?.[0]?.fullTextAnnotation?.text

        if (!fullText) {
            return NextResponse.json({ success: false, error: 'No text detected' })
        }

        // Clean text - remove nikkud but keep Hebrew
        const cleanText = fullText
            .replace(/[\u0591-\u05C7]/g, '') // Remove nikkud/taamim
            .replace(/[^\u05D0-\u05EA\s]/g, ' ') // Keep only Hebrew letters
            .replace(/\s+/g, ' ')
            .trim()

        const words = cleanText.split(' ').filter((w: string) => w.length > 1)
        const searchQuery = words.slice(0, 10).join(' ')

        console.log('OCR search query:', searchQuery)

        // Sefaria ElasticSearch API - proper format per their docs
        // Using naive_lemmatizer with slop for flexible Hebrew matching
        try {
            const searchBody = {
                size: 10,
                highlight: {
                    pre_tags: ['<b>'],
                    post_tags: ['</b>'],
                    fields: {
                        naive_lemmatizer: { fragment_size: 200 }
                    }
                },
                query: {
                    match_phrase: {
                        naive_lemmatizer: {
                            query: searchQuery,
                            slop: 10  // Allow up to 10 words between terms
                        }
                    }
                }
            }

            console.log('Calling Sefaria API...')
            const sefariaRes = await fetch('https://www.sefaria.org/api/search/text/_search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchBody),
                signal: AbortSignal.timeout(15000)
            })

            if (sefariaRes.ok) {
                const data = await sefariaRes.json() as any
                const hits = data.hits?.hits || []
                console.log(`Sefaria returned ${hits.length} hits`)

                for (const hit of hits.slice(0, 5)) {
                    const source = hit._source
                    const highlight = hit.highlight?.naive_lemmatizer?.[0] || ''
                    if (source?.ref) {
                        candidates.push({
                            sourceName: source.ref,
                            sefariaRef: source.ref,
                            previewText: highlight || (source.he || '').substring(0, 100),
                            source: 'Sefaria'
                        })
                    }
                }
            } else {
                const errText = await sefariaRes.text()
                console.error('Sefaria error:', sefariaRes.status, errText.substring(0, 200))
            }
        } catch (e) {
            console.error('Sefaria fetch error:', e)
        }

        // If Sefaria failed, try exact match
        if (candidates.length === 0) {
            try {
                const exactBody = {
                    size: 10,
                    query: {
                        match_phrase: {
                            exact: {
                                query: searchQuery
                            }
                        }
                    }
                }

                const exactRes = await fetch('https://www.sefaria.org/api/search/text/_search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(exactBody),
                    signal: AbortSignal.timeout(10000)
                })

                if (exactRes.ok) {
                    const data = await exactRes.json() as any
                    const hits = data.hits?.hits || []
                    console.log(`Sefaria exact returned ${hits.length} hits`)

                    for (const hit of hits.slice(0, 5)) {
                        const source = hit._source
                        if (source?.ref) {
                            candidates.push({
                                sourceName: source.ref,
                                sefariaRef: source.ref,
                                previewText: (source.he || '').substring(0, 100),
                                source: 'Sefaria (exact)'
                            })
                        }
                    }
                }
            } catch (e) {
                console.error('Sefaria exact error:', e)
            }
        }

        // Return results
        if (candidates.length === 0) {
            candidates.push({
                sourceName: 'No match found',
                sefariaRef: '',
                previewText: cleanText.substring(0, 150),
                source: 'OCR Only'
            })
        }

        return NextResponse.json({
            success: true,
            candidates,
            ocrText: cleanText.substring(0, 100),
            searchQuery
        })

    } catch (error) {
        console.error('Error:', error)
        return NextResponse.json({ success: false, error: String(error) })
    }
}
