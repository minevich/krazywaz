import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_VISION_API_KEY = process.env.GOOGLE_VISION_API_KEY || 'AIzaSyAXKKKN7H5WmZjQXipg7ghBQHkIxhVyWN0'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const useOCR = formData.get('useOCR') === 'true'

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size, 'UseOCR:', useOCR)

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        let text = ''
        let method = ''

        // Determine processing method
        const isImage = file.type.startsWith('image/')
        const isPdf = file.type === 'application/pdf'

        if (isImage) {
            // Images can use Google Vision OCR directly
            if (useOCR) {
                console.log('Using Google Vision OCR for image...')
                text = await ocrWithGoogleVision(buffer)
                method = 'google_vision'
            } else {
                return NextResponse.json({
                    error: 'Images require OCR. Please enable the OCR option.',
                    requiresOCR: true
                }, { status: 400 })
            }
        } else if (isPdf) {
            // PDFs: try embedded text extraction first
            console.log('Extracting embedded text from PDF...')
            text = await extractTextFromPdf(buffer)
            method = 'pdf_text'

            if (!text.trim() && useOCR) {
                // No embedded text found - inform user about PDF limitation
                return NextResponse.json({
                    error: 'This PDF appears to be scanned/image-based. Google Vision cannot directly process PDFs. Please convert your PDF to images (JPG/PNG) first, then upload those.',
                    isPdfScan: true
                }, { status: 400 })
            } else if (!text.trim()) {
                return NextResponse.json({
                    error: 'No text found in PDF. This might be a scanned document. Please enable OCR and convert to images first.',
                    isPdfScan: true
                }, { status: 400 })
            }
        } else {
            return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF or image.' }, { status: 400 })
        }

        console.log('Extracted text length:', text.length, 'Method:', method)

        // Parse the text into individual sources
        const sources = parseSourcesFromText(text)

        return NextResponse.json({
            success: true,
            rawText: text,
            sources,
            method
        })
    } catch (error) {
        console.error('Processing error:', error)
        return NextResponse.json({
            error: 'Failed to process file: ' + (error as Error).message
        }, { status: 500 })
    }
}

async function ocrWithGoogleVision(buffer: Buffer): Promise<string> {
    const base64Image = buffer.toString('base64')

    const requestBody = {
        requests: [
            {
                image: {
                    content: base64Image
                },
                features: [
                    {
                        type: 'DOCUMENT_TEXT_DETECTION',
                        maxResults: 1
                    }
                ],
                imageContext: {
                    languageHints: ['he', 'en', 'yi']
                }
            }
        ]
    }

    console.log('Calling Google Vision API...')

    const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        }
    )

    const data = await response.json() as any

    console.log('Google Vision response status:', response.status)

    if (!response.ok) {
        console.error('Google Vision API error:', data)
        throw new Error(`Google Vision API error: ${data.error?.message || response.statusText}`)
    }

    // Check for errors in the response
    if (data.responses?.[0]?.error) {
        throw new Error(`Vision API error: ${data.responses[0].error.message}`)
    }

    const fullText = data.responses?.[0]?.fullTextAnnotation?.text || ''

    if (!fullText) {
        console.log('No text detected in image')
    }

    return fullText
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
    // Simple text extraction for PDFs with embedded text
    const pdfString = buffer.toString('latin1')

    const textBlocks: string[] = []
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g
    let match

    while ((match = streamRegex.exec(pdfString)) !== null) {
        const stream = match[1]
        const textRegex = /\((.*?)\)Tj|\[(.*?)\]TJ/g
        let textMatch
        while ((textMatch = textRegex.exec(stream)) !== null) {
            const text = textMatch[1] || textMatch[2]
            if (text) {
                const decoded = text
                    .replace(/\\n/g, '\n')
                    .replace(/\\r/g, '\r')
                    .replace(/\\t/g, '\t')
                    .replace(/\\\(/g, '(')
                    .replace(/\\\)/g, ')')
                    .replace(/\\\\/g, '\\')
                textBlocks.push(decoded)
            }
        }
    }

    return textBlocks.join(' ').trim()
}

function parseSourcesFromText(text: string): Array<{ id: string; text: string; type: string; title?: string }> {
    if (!text.trim()) return []

    const sources: Array<{ id: string; text: string; type: string; title?: string }> = []

    const blocks = text
        .split(/\n{2,}/)
        .map(b => b.trim())
        .filter(b => b.length > 15)

    blocks.forEach((block) => {
        const hebrewChars = (block.match(/[\u0590-\u05FF]/g) || []).length
        const totalAlphaChars = (block.match(/[a-zA-Z\u0590-\u05FF]/g) || []).length
        const isHebrew = totalAlphaChars > 0 && (hebrewChars / totalAlphaChars) > 0.5

        const lines = block.split('\n')
        let title = ''
        let content = block

        if (lines.length > 1) {
            const firstLine = lines[0].trim()
            const looksLikeTitle = (
                firstLine.length < 100 &&
                (
                    /^[א-ת]/.test(firstLine) ||
                    /רמב"ם|גמרא|משנה|שו"ע|רש"י|תוספות|מדרש|פרק|דף/.test(firstLine) ||
                    /^\d+[\.\)]/.test(firstLine)
                )
            )

            if (looksLikeTitle) {
                title = firstLine
                content = lines.slice(1).join('\n').trim()
            }
        }

        sources.push({
            id: crypto.randomUUID(),
            text: content || block,
            type: isHebrew ? 'hebrew' : 'english',
            title: title || undefined
        })
    })

    return sources
}
