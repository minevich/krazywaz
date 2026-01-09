import { NextRequest, NextResponse } from 'next/server'

// Use Google Vision REST API
const GOOGLE_CLOUD_API_KEY = process.env.GOOGLE_CLOUD_API_KEY || 'AIzaSyAXKKKN7H5WmZjQXipg7ghBQHkIxhVyWN0'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const imageFile = formData.get('image') as File

        if (!imageFile) {
            return NextResponse.json({ success: false, error: 'No image provided' })
        }

        console.log('--- Step 1: OCR with Google Vision ---')

        // Convert to base64
        const arrayBuffer = await imageFile.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString('base64')

        // Call Google Vision REST API
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
            const errorText = await visionRes.text()
            console.error('Vision API Error:', errorText)
            return NextResponse.json({
                success: false,
                error: `Vision API Error: ${visionRes.status}`
            })
        }

        const visionData = await visionRes.json() as any
        const fullText = visionData.responses?.[0]?.fullTextAnnotation?.text

        if (!fullText) {
            return NextResponse.json({
                success: false,
                error: 'No text detected in image'
            })
        }

        console.log(`OCR found ${fullText.length} chars`)

        // ============================================
        // Step 2: Clean OCR text - keep more characters
        // ============================================

        // Remove nikkud but keep more text
        let cleanText = fullText
            .replace(/[\u0591-\u05C7]/g, '') // Remove nikkud/taamim only
            .replace(/\s+/g, ' ')
            .trim()

        // Get ALL Hebrew words
        const hebrewOnly = cleanText
            .replace(/[^\u05D0-\u05EA\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()

        const words = hebrewOnly.split(' ').filter((w: string) => w.length > 1)

        // Use a larger chunk - 25 words for better matching
        const searchPhrase = words.slice(0, 25).join(' ')
        // Also create a shorter exact phrase for precise matching
        const exactPhrase = words.slice(0, 8).join(' ')

        console.log(`Full phrase (25 words): "${searchPhrase}"`)
        console.log(`Exact phrase (8 words): "${exactPhrase}"`)

        const candidates: Array<{ sourceName: string, sefariaRef: string, previewText: string, source?: string }> = []

        // ============================================
        // Step 3: Search Sefaria with EXACT phrase first
        // ============================================

        try {
            // Search with the shorter phrase first (more distinctive)
            const sefariaUrl = `https://www.sefaria.org/api/search-wrapper?q=${encodeURIComponent(exactPhrase)}&type=text&size=8`
            console.log('Searching Sefaria (exact)...')
            const sefariaRes = await fetch(sefariaUrl, { signal: AbortSignal.timeout(8000) })

            if (sefariaRes.ok) {
                const sefariaData = await sefariaRes.json() as any
                const hits = sefariaData.hits?.hits || sefariaData || []

                for (const hit of hits.slice(0, 3)) {
                    const source = hit._source || hit
                    if (source.ref) {
                        candidates.push({
                            sourceName: source.ref,
                            sefariaRef: source.ref,
                            previewText: (source.he || source.text || '').substring(0, 150),
                            source: 'Sefaria (exact match)'
                        })
                    }
                }
                console.log(`Sefaria exact found ${candidates.length} results`)
            }
        } catch (e) {
            console.error('Sefaria exact search error:', e)
        }

        // ============================================
        // Step 4: If no exact match, try broader search
        // ============================================

        if (candidates.length === 0) {
            try {
                const sefariaUrl = `https://www.sefaria.org/api/search-wrapper?q=${encodeURIComponent(searchPhrase)}&type=text&size=8`
                console.log('Searching Sefaria (broad)...')
                const sefariaRes = await fetch(sefariaUrl, { signal: AbortSignal.timeout(8000) })

                if (sefariaRes.ok) {
                    const sefariaData = await sefariaRes.json() as any
                    const hits = sefariaData.hits?.hits || sefariaData || []

                    for (const hit of hits.slice(0, 5)) {
                        const source = hit._source || hit
                        if (source.ref) {
                            candidates.push({
                                sourceName: source.ref,
                                sefariaRef: source.ref,
                                previewText: (source.he || source.text || '').substring(0, 150),
                                source: 'Sefaria'
                            })
                        }
                    }
                    console.log(`Sefaria broad found ${candidates.length} results`)
                }
            } catch (e) {
                console.error('Sefaria broad search error:', e)
            }
        }

        // ============================================
        // Step 5: Search HebrewBooks
        // ============================================

        try {
            const hbUrl = `https://hebrewbooks.org/ajax.ashx?type=search&val=${encodeURIComponent(exactPhrase)}`
            console.log('Searching HebrewBooks...')
            const hbRes = await fetch(hbUrl, {
                signal: AbortSignal.timeout(5000),
                headers: { 'Accept': 'application/json' }
            })

            if (hbRes.ok) {
                const hbText = await hbRes.text()
                const bookMatches = hbText.match(/hebrewbooks\.org\/\d+/g)
                if (bookMatches) {
                    for (const match of bookMatches.slice(0, 2)) {
                        const bookId = match.split('/')[1]
                        candidates.push({
                            sourceName: `HebrewBooks #${bookId}`,
                            sefariaRef: '',
                            previewText: `https://${match}`,
                            source: 'HebrewBooks'
                        })
                    }
                }
            }
        } catch (e) {
            console.error('HebrewBooks search error:', e)
        }

        // ============================================
        // Return results with OCR text for debugging
        // ============================================

        if (candidates.length === 0) {
            return NextResponse.json({
                success: true,
                candidates: [{
                    sourceName: 'No match found',
                    sefariaRef: '',
                    previewText: hebrewOnly.substring(0, 200),
                    source: 'OCR Only'
                }],
                ocrText: hebrewOnly,
                searchQuery: searchPhrase
            })
        }

        return NextResponse.json({
            success: true,
            candidates,
            ocrText: hebrewOnly.substring(0, 200),
            searchQuery: searchPhrase
        })

    } catch (error) {
        console.error('Identification Error:', error)
        return NextResponse.json({
            success: false,
            error: String(error)
        })
    }
}
