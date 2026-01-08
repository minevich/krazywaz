import { NextRequest, NextResponse } from 'next/server'
import { ImageAnnotatorClient } from '@google-cloud/vision'

// Initialize Vision Client
// This expects GOOGLE_APPLICATION_CREDENTIALS env var to be set to the path of the JSON key file
// OR standard Google Cloud auth to be configured.
const visionClient = new ImageAnnotatorClient()

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const imageFile = formData.get('image') as File

        if (!imageFile) {
            return NextResponse.json({ success: false, error: 'No image provided' })
        }

        console.log('--- Starting Identification with Google Vision ---')

        // 1. Convert to Buffer for Vision API
        const arrayBuffer = await imageFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // 2. Call Google Vision API for Text Detection (OCR)
        console.log('Sending to Vision API...')
        const [result] = await visionClient.documentTextDetection(buffer)
        const fullText = result.fullTextAnnotation?.text

        if (!fullText) {
            console.log('Vision found no text.')
            return NextResponse.json({ success: false, error: 'No text detected in image' })
        }

        console.log(`OCR Complete. Found ${fullText.length} chars.`)
        // console.log('Snippet:', fullText.substring(0, 100))

        // 3. Clean up text for Search
        // Take the first ~20 words to get a good distinct phrase, 
        // jumping over any initial garbage/headers if possible.
        // For now, we'll just take the first 150 characters or so.
        const cleanText = fullText.replace(/\s+/g, ' ').trim()
        const searchQuery = cleanText.substring(0, 200) // Search snippet

        console.log(`Searching Sefaria for: "${searchQuery.substring(0, 50)}..."`)

        // 4. Search Sefaria
        // We use the search-wrapper API or standard search
        const sefariaUrl = `https://www.sefaria.org/api/search-wrapper?q=${encodeURIComponent(searchQuery)}&index_type=text&size=5`

        const searchRes = await fetch(sefariaUrl)
        if (!searchRes.ok) {
            throw new Error(`Sefaria Search failed: ${searchRes.status}`)
        }

        const searchData = await searchRes.json() as any

        // 5. Map results to candidates
        // result structure might vary, but usually search-wrapper returns an array or hits object
        let invalidStructure = false
        let candidates: any[] = []

        if (searchData.hits && searchData.hits.hits) {
            candidates = searchData.hits.hits.map((hit: any) => {
                const source = hit._source
                return {
                    sourceName: source.ref, // e.g. "Berakhot 2a:1"
                    sefariaRef: source.ref,
                    previewText: source.he || source.text || '' // Hebrew or English text found
                }
            })
        } else if (Array.isArray(searchData)) {
            // Sometimes legacy wrapper returns array
            candidates = searchData.map((hit: any) => ({
                sourceName: hit.ref || hit.title,
                sefariaRef: hit.ref,
                previewText: hit.he || hit.text
            }))
        }

        // Filter out empty results
        candidates = candidates.filter(c => c.sourceName && c.sefariaRef)

        console.log(`Found ${candidates.length} candidates.`)

        if (candidates.length === 0) {
            // Fallback: If strict search failed, try searching for just a subset of words (fuzzy)
            // Or indicate no results.
            return NextResponse.json({
                success: true,
                candidates: [],
                debugOcr: cleanText.substring(0, 100) // Send back OCR text so user knows what happened
            })
        }

        return NextResponse.json({
            success: true,
            candidates
        })

    } catch (error) {
        console.error('Identification Error:', error)

        // Check for common auth error
        if (String(error).includes('Could not load the default credentials')) {
            return NextResponse.json({
                success: false,
                error: 'Server Missing Google Credentials. Please check GOOGLE_APPLICATION_CREDENTIALS.'
            })
        }

        return NextResponse.json({
            success: false,
            error: String(error)
        })
    }
}
