import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file' }, { status: 400 })
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const mimeType = file.type.startsWith('image/') ? file.type : 'image/png'

        // Analyze image to find natural break points (horizontal AND vertical)
        const regions = await findBreakPoints(buffer)

        const base64 = buffer.toString('base64')

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

async function findBreakPoints(imageBuffer: Buffer) {
    try {
        // Convert to grayscale and get raw pixel data
        const { data, info } = await sharp(imageBuffer)
            .grayscale()
            .raw()
            .toBuffer({ resolveWithObject: true })

        const width = info.width
        const height = info.height

        // --- HORIZONTAL SCAN (find row gaps = Y splits) ---
        const rowBrightness: number[] = []
        for (let y = 0; y < height; y++) {
            let sum = 0
            for (let x = 0; x < width; x++) {
                sum += data[y * width + x]
            }
            rowBrightness.push(sum / width)
        }

        // --- VERTICAL SCAN (find column gaps = X splits) ---
        const colBrightness: number[] = []
        for (let x = 0; x < width; x++) {
            let sum = 0
            for (let y = 0; y < height; y++) {
                sum += data[y * width + x]
            }
            colBrightness.push(sum / height)
        }

        // Find gaps in both directions
        const threshold = 245 // Very bright = white space
        const minHGap = Math.floor(height * 0.008) // Min horizontal gap size
        const minVGap = Math.floor(width * 0.02) // Min vertical gap size

        const hGaps = findGaps(rowBrightness, threshold, minHGap)
        const vGaps = findGaps(colBrightness, threshold, minVGap)

        console.log(`Found ${hGaps.length} horizontal gaps, ${vGaps.length} vertical gaps`)

        // Create Y split points from horizontal gaps
        const ySplits = [0, ...hGaps.map(g => g.center), height]

        // Create X split points from vertical gaps
        // Only use significant vertical gaps (likely column dividers)
        const significantVGaps = vGaps.filter(g => (g.end - g.start) > width * 0.02)
        const xSplits = significantVGaps.length > 0
            ? [0, ...significantVGaps.map(g => g.center), width]
            : [0, width] // No columns detected

        console.log(`Y splits: ${ySplits.length - 1} rows, X splits: ${xSplits.length - 1} columns`)

        // Generate regions from grid
        const regions: any[] = []

        for (let yi = 0; yi < ySplits.length - 1; yi++) {
            for (let xi = 0; xi < xSplits.length - 1; xi++) {
                const yStart = ySplits[yi]
                const yEnd = ySplits[yi + 1]
                const xStart = xSplits[xi]
                const xEnd = xSplits[xi + 1]

                // Skip very small regions
                const regionHeight = (yEnd - yStart) / height
                const regionWidth = (xEnd - xStart) / width
                if (regionHeight < 0.03 || regionWidth < 0.1) continue

                // Convert to 0-1000 scale
                const ymin = Math.floor((yStart / height) * 1000)
                const ymax = Math.floor((yEnd / height) * 1000)
                const xmin = Math.floor((xStart / width) * 1000)
                const xmax = Math.floor((xEnd / width) * 1000)

                regions.push({
                    title: `Source ${regions.length + 1}`,
                    box_2d: [ymin, xmin, ymax, xmax]
                })
            }
        }

        // If nothing found, return full page
        if (regions.length === 0) {
            regions.push({ title: 'Source 1', box_2d: [0, 0, 1000, 1000] })
        }

        console.log(`Created ${regions.length} source regions`)
        return regions

    } catch (e) {
        console.error('Image processing error:', e)
        return [{ title: 'Source 1', box_2d: [0, 0, 1000, 1000] }]
    }
}

function findGaps(brightness: number[], threshold: number, minSize: number) {
    const gaps: { start: number; end: number; center: number }[] = []
    let gapStart = -1

    for (let i = 0; i < brightness.length; i++) {
        const isWhite = brightness[i] > threshold

        if (isWhite && gapStart === -1) {
            gapStart = i
        } else if (!isWhite && gapStart !== -1) {
            const gapEnd = i
            if (gapEnd - gapStart >= minSize) {
                gaps.push({
                    start: gapStart,
                    end: gapEnd,
                    center: Math.floor((gapStart + gapEnd) / 2)
                })
            }
            gapStart = -1
        }
    }

    return gaps
}
