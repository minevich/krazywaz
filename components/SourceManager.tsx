'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, Loader2, X, Save, Trash2, ScanLine, Grid3X3, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import ReactCrop, { PercentCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

interface Source {
    id: string
    title: string
    pageIndex: number
    crop: PercentCrop
}

interface BoundingBox {
    x: number
    y: number
    width: number
    height: number
}

// ============================================
// CORE COMPUTER VISION - TEXT BLOCK DETECTION
// ============================================

function analyzeImage(canvas: HTMLCanvasElement): BoundingBox[] {
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    const width = canvas.width
    const height = canvas.height

    // Step 1: Convert to grayscale binary image
    const binary: boolean[][] = []
    for (let y = 0; y < height; y++) {
        binary[y] = []
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
            // Adaptive threshold: anything darker than 200 is "ink"
            binary[y][x] = gray < 200
        }
    }

    // Step 2: Dilate to connect nearby text (morphological dilation)
    // This connects characters into words and words into blocks
    const dilateRadius = Math.max(3, Math.floor(width / 150))
    const dilated = dilate(binary, width, height, dilateRadius)

    // Step 3: Find connected components using flood fill
    const labels = new Int32Array(width * height)
    let nextLabel = 1
    const componentBounds: Map<number, { minX: number; maxX: number; minY: number; maxY: number; pixels: number }> = new Map()

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (dilated[y][x] && labels[y * width + x] === 0) {
                // Flood fill this component
                const bounds = floodFill(dilated, labels, width, height, x, y, nextLabel)
                componentBounds.set(nextLabel, bounds)
                nextLabel++
            }
        }
    }

    console.log(`Found ${componentBounds.size} raw components`)

    // Step 4: Filter and merge components
    const boxes: BoundingBox[] = []
    const minArea = (width * height) * 0.005 // At least 0.5% of image
    const maxArea = (width * height) * 0.95 // Not the whole page

    componentBounds.forEach((bounds, label) => {
        const w = bounds.maxX - bounds.minX
        const h = bounds.maxY - bounds.minY
        const area = w * h

        if (area >= minArea && area <= maxArea && w > 20 && h > 20) {
            boxes.push({
                x: bounds.minX,
                y: bounds.minY,
                width: w,
                height: h
            })
        }
    })

    // Step 5: Merge overlapping boxes
    const merged = mergeOverlappingBoxes(boxes, width, height)

    // Step 6: Sort by position (top to bottom, left to right)
    merged.sort((a, b) => {
        const rowA = Math.floor(a.y / (height / 10))
        const rowB = Math.floor(b.y / (height / 10))
        if (rowA !== rowB) return rowA - rowB
        return a.x - b.x
    })

    console.log(`Final: ${merged.length} source regions`)
    return merged
}

function dilate(binary: boolean[][], width: number, height: number, radius: number): boolean[][] {
    const result: boolean[][] = []
    for (let y = 0; y < height; y++) {
        result[y] = []
        for (let x = 0; x < width; x++) {
            let found = false
            for (let dy = -radius; dy <= radius && !found; dy++) {
                for (let dx = -radius; dx <= radius && !found; dx++) {
                    const ny = y + dy
                    const nx = x + dx
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                        if (binary[ny][nx]) found = true
                    }
                }
            }
            result[y][x] = found
        }
    }
    return result
}

function floodFill(
    binary: boolean[][],
    labels: Int32Array,
    width: number,
    height: number,
    startX: number,
    startY: number,
    label: number
): { minX: number; maxX: number; minY: number; maxY: number; pixels: number } {
    const stack: [number, number][] = [[startX, startY]]
    let minX = startX, maxX = startX, minY = startY, maxY = startY
    let pixels = 0

    while (stack.length > 0) {
        const [x, y] = stack.pop()!
        if (x < 0 || x >= width || y < 0 || y >= height) continue
        if (!binary[y][x] || labels[y * width + x] !== 0) continue

        labels[y * width + x] = label
        pixels++
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)

        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
    }

    return { minX, maxX, minY, maxY, pixels }
}

function mergeOverlappingBoxes(boxes: BoundingBox[], imgWidth: number, imgHeight: number): BoundingBox[] {
    if (boxes.length === 0) return boxes

    // Merge boxes that are close together (likely same source)
    const mergeThreshold = imgHeight * 0.02 // 2% of image height

    let merged = [...boxes]
    let changed = true

    while (changed) {
        changed = false
        const newMerged: BoundingBox[] = []
        const used = new Set<number>()

        for (let i = 0; i < merged.length; i++) {
            if (used.has(i)) continue

            let current = { ...merged[i] }
            used.add(i)

            for (let j = i + 1; j < merged.length; j++) {
                if (used.has(j)) continue

                const other = merged[j]

                // Check if boxes should be merged (overlapping or very close)
                const overlapX = current.x < other.x + other.width + mergeThreshold &&
                    current.x + current.width + mergeThreshold > other.x
                const overlapY = current.y < other.y + other.height + mergeThreshold &&
                    current.y + current.height + mergeThreshold > other.y

                if (overlapX && overlapY) {
                    // Merge the boxes
                    const newX = Math.min(current.x, other.x)
                    const newY = Math.min(current.y, other.y)
                    const newRight = Math.max(current.x + current.width, other.x + other.width)
                    const newBottom = Math.max(current.y + current.height, other.y + other.height)

                    current = {
                        x: newX,
                        y: newY,
                        width: newRight - newX,
                        height: newBottom - newY
                    }
                    used.add(j)
                    changed = true
                }
            }

            newMerged.push(current)
        }

        merged = newMerged
    }

    return merged
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SourceManager() {
    const [file, setFile] = useState<File | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [sources, setSources] = useState<Source[]>([])
    const [pageImages, setPageImages] = useState<string[]>([])
    const [sliceModePageId, setSliceModePageId] = useState<number | null>(null)
    const [hoverLineY, setHoverLineY] = useState<number | null>(null)
    const [editingSourceId, setEditingSourceId] = useState<string | null>(null)
    const [sensitivity, setSensitivity] = useState(50) // For threshold adjustment

    const processFile = async (f: File) => {
        setIsProcessing(true)
        setSources([])
        setPageImages([])
        setSliceModePageId(null)

        try {
            let images: HTMLImageElement[] = []

            if (f.type === 'application/pdf') {
                images = await pdfToImages(f)
            } else {
                const img = await loadImage(URL.createObjectURL(f))
                images = [img]
            }

            const newPageImages: string[] = []
            const newSources: Source[] = []

            for (let i = 0; i < images.length; i++) {
                const img = images[i]

                // Create canvas for analysis
                const canvas = document.createElement('canvas')
                canvas.width = img.naturalWidth || img.width
                canvas.height = img.naturalHeight || img.height
                const ctx = canvas.getContext('2d')!
                ctx.drawImage(img, 0, 0)

                // Store the image
                const dataUrl = canvas.toDataURL('image/png')
                newPageImages.push(dataUrl)

                // Analyze image to find text blocks
                console.log(`Analyzing page ${i + 1}...`)
                const boxes = analyzeImage(canvas)

                // Convert boxes to sources
                boxes.forEach((box, idx) => {
                    newSources.push({
                        id: crypto.randomUUID(),
                        title: `Source ${idx + 1}`,
                        pageIndex: i,
                        crop: {
                            unit: '%',
                            x: (box.x / canvas.width) * 100,
                            y: (box.y / canvas.height) * 100,
                            width: (box.width / canvas.width) * 100,
                            height: (box.height / canvas.height) * 100
                        }
                    })
                })

                // Fallback if no boxes found
                if (boxes.length === 0) {
                    newSources.push({
                        id: crypto.randomUUID(),
                        title: `Page ${i + 1}`,
                        pageIndex: i,
                        crop: { unit: '%', x: 0, y: 0, width: 100, height: 100 }
                    })
                }
            }

            setPageImages(newPageImages)
            setSources(newSources)

        } catch (e) {
            console.error('Processing error:', e)
            alert('Error: ' + e)
        } finally {
            setIsProcessing(false)
        }
    }

    // Helpers
    const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = src
        })
    }

    const pdfToImages = async (pdfFile: File): Promise<HTMLImageElement[]> => {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        const pdf = await pdfjsLib.getDocument({ data: await pdfFile.arrayBuffer() }).promise
        const images: HTMLImageElement[] = []

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const viewport = page.getViewport({ scale: 2 })
            const canvas = document.createElement('canvas')
            canvas.width = viewport.width
            canvas.height = viewport.height
            await page.render({
                canvasContext: canvas.getContext('2d')!,
                viewport,
                canvas
            } as any).promise

            const img = await loadImage(canvas.toDataURL())
            images.push(img)
        }

        return images
    }

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        const f = e.dataTransfer.files[0]
        if (f) {
            setFile(f)
            processFile(f)
        }
    }, [])

    const onUpdateCrop = (id: string, c: PercentCrop) => {
        setSources(sources.map(s => s.id === id ? { ...s, crop: c } : s))
    }

    const handleSliceClick = (e: React.MouseEvent<HTMLDivElement>, pageIndex: number, imgElement: HTMLImageElement) => {
        if (sliceModePageId !== pageIndex) return
        const rect = imgElement.getBoundingClientRect()
        const clickY = e.clientY - rect.top
        const percentageY = (clickY / rect.height) * 100

        const targetSource = sources.find(s =>
            s.pageIndex === pageIndex &&
            percentageY >= s.crop.y &&
            percentageY <= (s.crop.y + s.crop.height)
        )

        if (targetSource) {
            const oldHeight = targetSource.crop.height
            const splitRelativeY = percentageY - targetSource.crop.y
            if (splitRelativeY < 2 || (oldHeight - splitRelativeY) < 2) return

            const updatedTop = {
                ...targetSource,
                crop: { ...targetSource.crop, height: splitRelativeY },
            }

            const newBottom: Source = {
                id: crypto.randomUUID(),
                title: `Source ${sources.filter(s => s.pageIndex === pageIndex).length + 1}`,
                pageIndex,
                crop: { ...targetSource.crop, y: targetSource.crop.y + splitRelativeY, height: oldHeight - splitRelativeY }
            }

            setSources(prev => {
                const idx = prev.findIndex(p => p.id === targetSource.id)
                const next = [...prev]
                next[idx] = updatedTop
                next.splice(idx + 1, 0, newBottom)
                return next
            })
        }
    }

    const splitPageIntoGrid = (pageIndex: number, rows: number, cols: number) => {
        const otherSources = sources.filter(s => s.pageIndex !== pageIndex)
        const newSources: Source[] = []
        const cellWidth = 100 / cols
        const cellHeight = 100 / rows
        let num = 1
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                newSources.push({
                    id: crypto.randomUUID(),
                    title: `Source ${num}`,
                    pageIndex,
                    crop: { unit: '%', x: c * cellWidth, y: r * cellHeight, width: cellWidth, height: cellHeight }
                })
                num++
            }
        }
        setSources([...otherSources, ...newSources])
    }

    return (
        <div className="max-w-5xl mx-auto p-4 font-sans text-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Source Extractor</h1>
                    <p className="text-gray-500 text-xs">Computer Vision • Auto-detects text blocks</p>
                </div>
                {file && (
                    <button onClick={() => processFile(file)} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" /> Re-analyze
                    </button>
                )}
            </div>

            {/* Upload */}
            {!file && (
                <div
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => document.getElementById('uploader')?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all"
                >
                    <Upload className="w-8 h-8 text-blue-600 mb-3" />
                    <h3 className="text-base font-semibold">Upload Source Sheet</h3>
                    <p className="text-gray-400 text-xs mt-1">PDF or Image</p>
                    <input
                        id="uploader" type="file" className="hidden" accept=".pdf,image/*"
                        onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); processFile(f); } }}
                    />
                </div>
            )}

            {/* Processing */}
            {isProcessing && (
                <div className="text-center py-16">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Analyzing image structure...</p>
                    <p className="text-gray-400 text-xs mt-1">Finding text blocks using computer vision</p>
                </div>
            )}

            {/* Results */}
            {!isProcessing && pageImages.length > 0 && (
                <div className="space-y-6">
                    {pageImages.map((img, pageIdx) => (
                        <div key={pageIdx} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                            {/* Toolbar */}
                            <div className="bg-gray-50 px-3 py-2 border-b flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-gray-700 text-xs">Page {pageIdx + 1}</span>
                                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                        {sources.filter(s => s.pageIndex === pageIdx).length} sources found
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {[2, 3, 4, 6, 9].map(n => (
                                        <button key={n} onClick={() => splitPageIntoGrid(pageIdx, n <= 4 ? n : 3, n <= 4 ? 1 : n / 3)}
                                            className="w-6 h-6 text-[10px] bg-gray-200 hover:bg-gray-300 rounded font-bold">{n}</button>
                                    ))}
                                    <button
                                        onClick={() => setSliceModePageId(sliceModePageId === pageIdx ? null : pageIdx)}
                                        className={`ml-2 flex items-center gap-1 px-2 py-1 text-xs font-bold rounded ${sliceModePageId === pageIdx ? 'bg-red-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                                    >
                                        <ScanLine className="w-3 h-3" /> Slice
                                    </button>
                                </div>
                            </div>

                            {/* Image with overlays */}
                            <div
                                className={`relative ${sliceModePageId === pageIdx ? 'cursor-crosshair' : ''}`}
                                onMouseMove={e => sliceModePageId === pageIdx && setHoverLineY(e.clientY - e.currentTarget.getBoundingClientRect().top)}
                                onMouseLeave={() => setHoverLineY(null)}
                                onClick={e => sliceModePageId === pageIdx && handleSliceClick(e, pageIdx, e.currentTarget.querySelector('img')!)}
                            >
                                <img src={img} className="w-full block" />

                                {sliceModePageId === pageIdx && hoverLineY !== null && (
                                    <div className="absolute w-full h-0.5 bg-red-500 z-50 pointer-events-none" style={{ top: hoverLineY }}>
                                        <div className="absolute right-2 -top-5 bg-red-600 text-white text-[9px] px-2 py-0.5 rounded">Click to cut</div>
                                    </div>
                                )}

                                {sources.filter(s => s.pageIndex === pageIdx).map((source, idx) => (
                                    <div key={source.id} className="absolute group" style={{
                                        left: `${source.crop.x}%`, top: `${source.crop.y}%`,
                                        width: `${source.crop.width}%`, height: `${source.crop.height}%`,
                                    }}>
                                        <div
                                            className={`w-full h-full border-2 ${sliceModePageId === pageIdx ? 'border-red-400 border-dashed' : 'border-blue-500 hover:border-blue-600'} bg-blue-500/5 hover:bg-blue-500/10 cursor-pointer`}
                                            onClick={e => { if (sliceModePageId !== pageIdx) { e.stopPropagation(); setEditingSourceId(source.id); } }}
                                        >
                                            <span className={`absolute top-1 left-1 ${sliceModePageId === pageIdx ? 'bg-red-600' : 'bg-blue-600'} text-white text-[10px] px-1.5 py-0.5 rounded font-bold`}>
                                                {idx + 1}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Save */}
                    <div className="flex justify-center py-6">
                        <button className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-full shadow-lg hover:bg-blue-700 flex items-center gap-2">
                            <Save className="w-4 h-4" /> Save {sources.length} Sources
                        </button>
                    </div>

                    {/* Edit Modal */}
                    {editingSourceId && !sliceModePageId && (() => {
                        const source = sources.find(s => s.id === editingSourceId)
                        if (!source) return null
                        return (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                                <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                                    <div className="p-3 border-b flex justify-between items-center">
                                        <span className="font-bold">Adjust Source {sources.indexOf(source) + 1}</span>
                                        <button onClick={() => setEditingSourceId(null)} className="p-1 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
                                    </div>
                                    <div className="flex-1 overflow-auto p-4 bg-gray-100 flex justify-center">
                                        <ReactCrop crop={source.crop} onChange={(_, p) => onUpdateCrop(source.id, p)} className="shadow bg-white">
                                            <img src={pageImages[source.pageIndex]} className="max-h-[65vh]" />
                                        </ReactCrop>
                                    </div>
                                    <div className="p-3 border-t flex justify-between">
                                        <button onClick={() => { setSources(sources.filter(s => s.id !== editingSourceId)); setEditingSourceId(null); }}
                                            className="text-red-600 px-3 py-1.5 rounded flex items-center gap-1 text-xs"><Trash2 className="w-3 h-3" /> Delete</button>
                                        <button onClick={() => setEditingSourceId(null)} className="bg-blue-600 text-white px-4 py-1.5 rounded font-bold text-xs">Done</button>
                                    </div>
                                </div>
                            </div>
                        )
                    })()}
                </div>
            )}
        </div>
    )
}
