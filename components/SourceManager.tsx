'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ============================================================================
// TYPES
// ============================================================================

interface Source {
    id: string
    pageIndex: number
    // For rectangles
    box: { x: number; y: number; width: number; height: number } | null
    // For polygons (array of points, each as % of image size)
    polygon: Array<{ x: number; y: number }> | null
    rotation: number  // -180 to 180 degrees
    clippedImage: string | null
    text: string
    reference: string | null
    sefariaUrl: string | null
    sefariaText: string | null
}

interface PageData {
    imageDataUrl: string
    width: number
    height: number
    imageElement: HTMLImageElement | null
}

type AppState = 'upload' | 'processing' | 'editing' | 'preview'
type DrawMode = 'rectangle' | 'polygon'

// ============================================================================
// PDF TO IMAGES
// ============================================================================

async function convertPdfToImages(file: File): Promise<PageData[]> {
    const pdfjs = await import('pdfjs-dist')
    const pdfjsLib = pdfjs.default || pdfjs
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const pages: PageData[] = []

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const scale = 2
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height

        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport } as any).promise

        const dataUrl = canvas.toDataURL('image/png')

        // Pre-load image element
        const img = new Image()
        img.src = dataUrl
        await new Promise(resolve => { img.onload = resolve })

        pages.push({
            imageDataUrl: dataUrl,
            width: viewport.width,
            height: viewport.height,
            imageElement: img
        })
    }

    return pages
}

async function convertImageToDataUrl(file: File): Promise<PageData> {
    return new Promise((resolve) => {
        const reader = new FileReader()
        const img = new Image()

        reader.onload = () => {
            img.onload = () => {
                resolve({
                    imageDataUrl: reader.result as string,
                    width: img.width,
                    height: img.height,
                    imageElement: img
                })
            }
            img.src = reader.result as string
        }
        reader.readAsDataURL(file)
    })
}

// ============================================================================
// CLIPPING FUNCTION
// ============================================================================

function clipSourceImage(source: Source, page: PageData): string | null {
    if (!page.imageElement) return null

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    if (source.box) {
        // Rectangle clipping
        const sx = (source.box.x / 100) * page.width
        const sy = (source.box.y / 100) * page.height
        const sw = (source.box.width / 100) * page.width
        const sh = (source.box.height / 100) * page.height

        // Account for rotation by expanding canvas if needed
        const angle = (source.rotation * Math.PI) / 180
        const cos = Math.abs(Math.cos(angle))
        const sin = Math.abs(Math.sin(angle))
        const newW = sw * cos + sh * sin
        const newH = sw * sin + sh * cos

        canvas.width = newW
        canvas.height = newH

        ctx.save()
        ctx.translate(newW / 2, newH / 2)
        ctx.rotate(angle)
        ctx.drawImage(page.imageElement, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh)
        ctx.restore()

        return canvas.toDataURL('image/png')
    } else if (source.polygon && source.polygon.length >= 3) {
        // Polygon clipping
        const points = source.polygon.map(p => ({
            x: (p.x / 100) * page.width,
            y: (p.y / 100) * page.height
        }))

        // Find bounding box
        const minX = Math.min(...points.map(p => p.x))
        const maxX = Math.max(...points.map(p => p.x))
        const minY = Math.min(...points.map(p => p.y))
        const maxY = Math.max(...points.map(p => p.y))

        canvas.width = maxX - minX
        canvas.height = maxY - minY

        // Create clip path
        ctx.beginPath()
        ctx.moveTo(points[0].x - minX, points[0].y - minY)
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x - minX, points[i].y - minY)
        }
        ctx.closePath()
        ctx.clip()

        // Apply rotation
        const angle = (source.rotation * Math.PI) / 180
        ctx.save()
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate(angle)
        ctx.translate(-canvas.width / 2, -canvas.height / 2)
        ctx.drawImage(page.imageElement, minX, minY, maxX - minX, maxY - minY, 0, 0, maxX - minX, maxY - minY)
        ctx.restore()

        return canvas.toDataURL('image/png')
    }

    return null
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SourceManager() {
    // State
    const [appState, setAppState] = useState<AppState>('upload')
    const [pages, setPages] = useState<PageData[]>([])
    const [sources, setSources] = useState<Source[]>([])
    const [currentPageIndex, setCurrentPageIndex] = useState(0)
    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
    const [statusMessage, setStatusMessage] = useState('')
    const [error, setError] = useState<string | null>(null)

    // Drawing mode
    const [drawMode, setDrawMode] = useState<DrawMode>('rectangle')

    // Rectangle drawing
    const [isDrawing, setIsDrawing] = useState(false)
    const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
    const [drawEnd, setDrawEnd] = useState<{ x: number; y: number } | null>(null)

    // Polygon drawing
    const [polygonPoints, setPolygonPoints] = useState<Array<{ x: number; y: number }>>([])

    // Editing
    const [editMode, setEditMode] = useState<'none' | 'drag' | 'resize'>('none')
    const [editingSourceId, setEditingSourceId] = useState<string | null>(null)
    const [editStart, setEditStart] = useState<{ x: number; y: number; box: { x: number; y: number; width: number; height: number } } | null>(null)
    const [resizeHandle, setResizeHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null)

    const canvasRef = useRef<HTMLDivElement>(null)

    // ============================================================================
    // AUTO-GENERATE CLIPPED IMAGES when sources change
    // ============================================================================
    useEffect(() => {
        const generateMissingClips = async () => {
            const updated = sources.map(s => {
                if (!s.clippedImage && (s.box || s.polygon)) {
                    const page = pages[s.pageIndex]
                    if (page) {
                        return { ...s, clippedImage: clipSourceImage(s, page) }
                    }
                }
                return s
            })

            // Only update if something changed
            const hasChanges = updated.some((s, i) => s.clippedImage !== sources[i].clippedImage)
            if (hasChanges) {
                setSources(updated)
            }
        }

        if (pages.length > 0 && sources.length > 0) {
            generateMissingClips()
        }
    }, [sources, pages])

    // ============================================================================
    // FILE HANDLING
    // ============================================================================

    const handleFileUpload = async (file: File) => {
        setError(null)
        setAppState('processing')
        setStatusMessage('Loading file...')

        try {
            let pageData: PageData[]

            if (file.type === 'application/pdf') {
                setStatusMessage('Converting PDF pages to images...')
                pageData = await convertPdfToImages(file)
            } else {
                setStatusMessage('Loading image...')
                pageData = [await convertImageToDataUrl(file)]
            }

            setPages(pageData)
            setStatusMessage(`Loaded ${pageData.length} page(s). Analyzing with AI...`)

            // Analyze each page
            const allSources: Source[] = []

            for (let i = 0; i < pageData.length; i++) {
                setStatusMessage(`Analyzing page ${i + 1} of ${pageData.length}...`)
                const pageSources = await analyzePageWithGemini(pageData[i], i)
                allSources.push(...pageSources)
            }

            // Generate clipped images for all sources immediately
            for (const source of allSources) {
                source.clippedImage = clipSourceImage(source, pageData[source.pageIndex])
            }

            if (allSources.length === 0) {
                setStatusMessage('No sources detected. Draw boxes manually.')
            } else {
                setStatusMessage(`Found ${allSources.length} sources.`)
            }

            setSources(allSources)
            setCurrentPageIndex(0)
            setAppState('editing')

        } catch (err) {
            console.error('Error processing file:', err)
            setError(String(err))
            setAppState('upload')
        }
    }

    // ============================================================================
    // AI ANALYSIS
    // ============================================================================

    const analyzePageWithGemini = async (page: PageData, pageIndex: number): Promise<Source[]> => {
        try {
            const response = await fetch(page.imageDataUrl)
            const blob = await response.blob()
            const file = new File([blob], 'page.png', { type: 'image/png' })

            const formData = new FormData()
            formData.append('image', file)

            const res = await fetch('/api/sources/analyze', {
                method: 'POST',
                body: formData
            })

            const data = await res.json() as {
                success: boolean
                sources?: Array<{
                    id?: string
                    box: { x: number; y: number; width: number; height: number }
                    text?: string
                    reference?: string | null
                }>
            }

            if (data.success && data.sources && data.sources.length > 0) {
                return data.sources.map((s) => ({
                    id: s.id || `source-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    pageIndex,
                    box: s.box,
                    polygon: null,
                    rotation: 0,
                    clippedImage: null,
                    text: s.text || '',
                    reference: s.reference || null,
                    sefariaUrl: null,
                    sefariaText: null
                }))
            }

            return []
        } catch (err) {
            console.error('Gemini analysis failed:', err)
            return []
        }
    }

    // ============================================================================
    // SOURCE MANAGEMENT
    // ============================================================================

    const deleteSource = (id: string) => {
        setSources(prev => prev.filter(s => s.id !== id))
        if (selectedSourceId === id) setSelectedSourceId(null)
    }

    const updateSourceRotation = (id: string, rotation: number) => {
        setSources(prev => prev.map(s => {
            if (s.id === id) {
                const updated = { ...s, rotation, clippedImage: null } // Clear image to regenerate
                return updated
            }
            return s
        }))
    }

    const updateSourceReference = (id: string, reference: string) => {
        setSources(prev => prev.map(s =>
            s.id === id ? { ...s, reference } : s
        ))
    }

    const clearCurrentPage = () => {
        setSources(prev => prev.filter(s => s.pageIndex !== currentPageIndex))
        setSelectedSourceId(null)
    }

    const applyQuickGrid = (rows: number) => {
        const newSources: Source[] = []
        const rowHeight = 90 / rows

        for (let i = 0; i < rows; i++) {
            const source: Source = {
                id: `grid-${currentPageIndex}-${i}-${Date.now()}`,
                pageIndex: currentPageIndex,
                box: { x: 5, y: 5 + (i * rowHeight), width: 90, height: rowHeight },
                polygon: null,
                rotation: 0,
                clippedImage: null,
                text: '',
                reference: null,
                sefariaUrl: null,
                sefariaText: null
            }
            newSources.push(source)
        }

        setSources(prev => [
            ...prev.filter(s => s.pageIndex !== currentPageIndex),
            ...newSources
        ])
    }

    // ============================================================================
    // DRAWING HANDLERS
    // ============================================================================

    const getRelativePosition = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!canvasRef.current) return { x: 0, y: 0 }
        const rect = canvasRef.current.getBoundingClientRect()
        return {
            x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
            y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
        }
    }

    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (drawMode === 'polygon' && appState === 'editing') {
            const pos = getRelativePosition(e)
            setPolygonPoints(prev => [...prev, pos])
        }
    }

    const finishPolygon = () => {
        if (polygonPoints.length >= 3) {
            const newSource: Source = {
                id: `polygon-${Date.now()}`,
                pageIndex: currentPageIndex,
                box: null,
                polygon: [...polygonPoints],
                rotation: 0,
                clippedImage: null,
                text: '',
                reference: null,
                sefariaUrl: null,
                sefariaText: null
            }
            setSources(prev => [...prev, newSource])
            setSelectedSourceId(newSource.id)
        }
        setPolygonPoints([])
    }

    const cancelPolygon = () => {
        setPolygonPoints([])
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (appState !== 'editing' || drawMode !== 'rectangle') return
        if (editMode !== 'none') return

        const pos = getRelativePosition(e)
        setIsDrawing(true)
        setDrawStart(pos)
        setDrawEnd(pos)
        setSelectedSourceId(null)
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const pos = getRelativePosition(e)

        if (editMode !== 'none' && editingSourceId && editStart) {
            const deltaX = pos.x - editStart.x
            const deltaY = pos.y - editStart.y

            setSources(prev => prev.map(s => {
                if (s.id !== editingSourceId || !s.box) return s

                if (editMode === 'drag') {
                    return {
                        ...s,
                        box: {
                            ...s.box,
                            x: Math.max(0, Math.min(100 - editStart.box.width, editStart.box.x + deltaX)),
                            y: Math.max(0, Math.min(100 - editStart.box.height, editStart.box.y + deltaY))
                        },
                        clippedImage: null // Regenerate
                    }
                } else if (editMode === 'resize' && resizeHandle) {
                    let newX = editStart.box.x
                    let newY = editStart.box.y
                    let newW = editStart.box.width
                    let newH = editStart.box.height

                    if (resizeHandle.includes('w')) {
                        newX = Math.min(editStart.box.x + editStart.box.width - 5, editStart.box.x + deltaX)
                        newW = editStart.box.width - deltaX
                    }
                    if (resizeHandle.includes('e')) {
                        newW = Math.max(5, editStart.box.width + deltaX)
                    }
                    if (resizeHandle.includes('n')) {
                        newY = Math.min(editStart.box.y + editStart.box.height - 5, editStart.box.y + deltaY)
                        newH = editStart.box.height - deltaY
                    }
                    if (resizeHandle.includes('s')) {
                        newH = Math.max(5, editStart.box.height + deltaY)
                    }

                    return {
                        ...s,
                        box: {
                            x: Math.max(0, newX),
                            y: Math.max(0, newY),
                            width: Math.max(5, Math.min(100 - newX, newW)),
                            height: Math.max(5, Math.min(100 - newY, newH))
                        },
                        clippedImage: null
                    }
                }
                return s
            }))
            return
        }

        if (isDrawing && drawMode === 'rectangle') {
            setDrawEnd(pos)
        }
    }

    const handleMouseUp = () => {
        if (editMode !== 'none') {
            setEditMode('none')
            setEditingSourceId(null)
            setEditStart(null)
            setResizeHandle(null)
            return
        }

        if (!isDrawing || !drawStart || !drawEnd) {
            setIsDrawing(false)
            return
        }

        const x = Math.min(drawStart.x, drawEnd.x)
        const y = Math.min(drawStart.y, drawEnd.y)
        const width = Math.abs(drawEnd.x - drawStart.x)
        const height = Math.abs(drawEnd.y - drawStart.y)

        if (width > 3 && height > 3) {
            const newSource: Source = {
                id: `rect-${Date.now()}`,
                pageIndex: currentPageIndex,
                box: { x, y, width, height },
                polygon: null,
                rotation: 0,
                clippedImage: null,
                text: '',
                reference: null,
                sefariaUrl: null,
                sefariaText: null
            }
            setSources(prev => [...prev, newSource])
            setSelectedSourceId(newSource.id)
        }

        setIsDrawing(false)
        setDrawStart(null)
        setDrawEnd(null)
    }

    const startDrag = (e: React.MouseEvent<HTMLDivElement>, source: Source) => {
        if (!source.box) return
        e.stopPropagation()
        const pos = getRelativePosition(e)
        setEditMode('drag')
        setEditingSourceId(source.id)
        setEditStart({ x: pos.x, y: pos.y, box: { ...source.box } })
        setSelectedSourceId(source.id)
    }

    const startResize = (e: React.MouseEvent<HTMLDivElement>, source: Source, handle: 'nw' | 'ne' | 'sw' | 'se') => {
        if (!source.box) return
        e.stopPropagation()
        const pos = getRelativePosition(e)
        setEditMode('resize')
        setEditingSourceId(source.id)
        setResizeHandle(handle)
        setEditStart({ x: pos.x, y: pos.y, box: { ...source.box } })
        setSelectedSourceId(source.id)
    }

    // ============================================================================
    // COMPUTED VALUES
    // ============================================================================

    const currentPageSources = sources.filter(s => s.pageIndex === currentPageIndex)
    const selectedSource = sources.find(s => s.id === selectedSourceId)

    // ============================================================================
    // RENDER
    // ============================================================================

    return (
        <div className="h-screen flex flex-col bg-slate-100">
            {/* HEADER */}
            <header className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-slate-800">📜 Source Clipper</h1>

                    {statusMessage && (
                        <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                            {statusMessage}
                        </span>
                    )}
                </div>

                {pages.length > 0 && (
                    <div className="flex items-center gap-3">
                        {/* Draw Mode Toggle */}
                        <div className="flex bg-slate-100 rounded-lg p-0.5">
                            <button
                                onClick={() => { setDrawMode('rectangle'); setPolygonPoints([]) }}
                                className={`px-3 py-1 text-sm rounded ${drawMode === 'rectangle' ? 'bg-white shadow' : ''}`}
                            >
                                ▭ Rectangle
                            </button>
                            <button
                                onClick={() => setDrawMode('polygon')}
                                className={`px-3 py-1 text-sm rounded ${drawMode === 'polygon' ? 'bg-white shadow' : ''}`}
                            >
                                ⬡ Polygon
                            </button>
                        </div>

                        {/* Polygon controls */}
                        {drawMode === 'polygon' && polygonPoints.length > 0 && (
                            <div className="flex gap-1">
                                <span className="text-xs text-slate-500">{polygonPoints.length} points</span>
                                <button
                                    onClick={finishPolygon}
                                    disabled={polygonPoints.length < 3}
                                    className="px-2 py-0.5 text-xs bg-green-500 text-white rounded disabled:opacity-50"
                                >
                                    ✓ Finish
                                </button>
                                <button
                                    onClick={cancelPolygon}
                                    className="px-2 py-0.5 text-xs bg-red-500 text-white rounded"
                                >
                                    ✗ Cancel
                                </button>
                            </div>
                        )}

                        {/* Page Navigation */}
                        <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
                            <button
                                onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                                disabled={currentPageIndex === 0}
                                className="text-slate-600 disabled:text-slate-300 font-bold"
                            >
                                ←
                            </button>
                            <span className="text-sm font-medium min-w-[80px] text-center">
                                Page {currentPageIndex + 1} / {pages.length}
                            </span>
                            <button
                                onClick={() => setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))}
                                disabled={currentPageIndex === pages.length - 1}
                                className="text-slate-600 disabled:text-slate-300 font-bold"
                            >
                                →
                            </button>
                        </div>

                        {/* Quick Grid */}
                        <div className="relative group">
                            <button className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg">
                                ⊞ Quick Grid
                            </button>
                            <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg p-2 hidden group-hover:block z-10">
                                {[2, 3, 4, 5, 6].map(n => (
                                    <button
                                        key={n}
                                        onClick={() => applyQuickGrid(n)}
                                        className="block w-full text-left px-3 py-1 text-sm hover:bg-blue-50 rounded"
                                    >
                                        {n} rows
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={clearCurrentPage}
                            className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                        >
                            🗑 Clear
                        </button>

                        {/* View Toggle */}
                        <div className="flex bg-slate-100 rounded-lg p-0.5">
                            <button
                                onClick={() => setAppState('editing')}
                                className={`px-3 py-1 text-sm rounded ${appState === 'editing' ? 'bg-white shadow' : ''}`}
                            >
                                ✏️ Edit
                            </button>
                            <button
                                onClick={() => setAppState('preview')}
                                className={`px-3 py-1 text-sm rounded ${appState === 'preview' ? 'bg-white shadow' : ''}`}
                            >
                                👁 Preview
                            </button>
                        </div>
                    </div>
                )}
            </header>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex overflow-hidden">

                {/* UPLOAD STATE */}
                {appState === 'upload' && (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div
                            onClick={() => document.getElementById('file-upload')?.click()}
                            onDrop={(e) => {
                                e.preventDefault()
                                const f = e.dataTransfer.files[0]
                                if (f) handleFileUpload(f)
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            className="w-full max-w-md border-2 border-dashed border-blue-300 rounded-2xl p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all"
                        >
                            <div className="text-5xl mb-4">📄</div>
                            <h2 className="text-xl font-semibold text-slate-800 mb-2">Upload Source Sheet</h2>
                            <p className="text-slate-500 mb-4">PDF or Image file</p>
                            {error && <p className="text-red-600 text-sm">{error}</p>}
                            <input
                                id="file-upload"
                                type="file"
                                accept=".pdf,image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0]
                                    if (f) handleFileUpload(f)
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* PROCESSING STATE */}
                {appState === 'processing' && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-5xl mb-4 animate-bounce">🔍</div>
                            <p className="text-lg font-medium text-slate-700">{statusMessage}</p>
                        </div>
                    </div>
                )}

                {/* EDITING STATE */}
                {appState === 'editing' && pages.length > 0 && (
                    <>
                        {/* Canvas */}
                        <div className="flex-1 overflow-auto p-6 flex justify-center">
                            <div
                                ref={canvasRef}
                                className={`relative inline-block select-none ${drawMode === 'polygon' ? 'cursor-crosshair' : 'cursor-crosshair'}`}
                                onClick={handleCanvasClick}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            >
                                <img
                                    src={pages[currentPageIndex].imageDataUrl}
                                    alt={`Page ${currentPageIndex + 1}`}
                                    className="max-h-[calc(100vh-120px)] shadow-xl rounded-lg pointer-events-none"
                                    draggable={false}
                                />

                                {/* Source Boxes */}
                                {currentPageSources.map((source, idx) => {
                                    if (source.box) {
                                        return (
                                            <div
                                                key={source.id}
                                                onClick={(e) => { e.stopPropagation(); setSelectedSourceId(source.id) }}
                                                className={`absolute border-2 transition-all group ${selectedSourceId === source.id
                                                    ? 'border-green-500 bg-green-500/20 shadow-lg z-20'
                                                    : 'border-blue-500 bg-blue-500/10 hover:bg-blue-500/20'
                                                    }`}
                                                style={{
                                                    left: `${source.box.x}%`,
                                                    top: `${source.box.y}%`,
                                                    width: `${source.box.width}%`,
                                                    height: `${source.box.height}%`,
                                                    transform: source.rotation ? `rotate(${source.rotation}deg)` : undefined,
                                                    transformOrigin: 'center center'
                                                }}
                                            >
                                                {/* Number */}
                                                <span className="absolute -top-3 -left-3 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow z-10">
                                                    {idx + 1}
                                                </span>

                                                {/* Delete */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteSource(source.id) }}
                                                    className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full shadow z-20"
                                                >
                                                    ×
                                                </button>

                                                {/* Drag area */}
                                                <div
                                                    onMouseDown={(e) => startDrag(e, source)}
                                                    className="absolute inset-4 cursor-move"
                                                />

                                                {/* Resize handles */}
                                                <div onMouseDown={(e) => startResize(e, source, 'nw')} className="absolute -top-1. -left-1.5 w-3 h-3 bg-blue-600 cursor-nw-resize rounded-sm" />
                                                <div onMouseDown={(e) => startResize(e, source, 'ne')} className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-600 cursor-ne-resize rounded-sm" />
                                                <div onMouseDown={(e) => startResize(e, source, 'sw')} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-blue-600 cursor-sw-resize rounded-sm" />
                                                <div onMouseDown={(e) => startResize(e, source, 'se')} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-600 cursor-se-resize rounded-sm" />
                                            </div>
                                        )
                                    } else if (source.polygon) {
                                        // Render polygon as SVG overlay
                                        const points = source.polygon.map(p => `${p.x}%,${p.y}%`).join(' ')
                                        return (
                                            <svg
                                                key={source.id}
                                                className="absolute inset-0 w-full h-full pointer-events-none"
                                                style={{ transform: source.rotation ? `rotate(${source.rotation}deg)` : undefined }}
                                            >
                                                <polygon
                                                    points={source.polygon.map(p => `${p.x}%,${p.y}%`).join(' ')}
                                                    fill={selectedSourceId === source.id ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.1)'}
                                                    stroke={selectedSourceId === source.id ? '#22c55e' : '#3b82f6'}
                                                    strokeWidth="2"
                                                    className="cursor-pointer pointer-events-auto"
                                                    onClick={(e) => { e.stopPropagation(); setSelectedSourceId(source.id) }}
                                                />
                                            </svg>
                                        )
                                    }
                                    return null
                                })}

                                {/* Drawing preview - Rectangle */}
                                {isDrawing && drawStart && drawEnd && (
                                    <div
                                        className="absolute border-2 border-blue-600 bg-blue-500/30 pointer-events-none"
                                        style={{
                                            left: `${Math.min(drawStart.x, drawEnd.x)}%`,
                                            top: `${Math.min(drawStart.y, drawEnd.y)}%`,
                                            width: `${Math.abs(drawEnd.x - drawStart.x)}%`,
                                            height: `${Math.abs(drawEnd.y - drawStart.y)}%`
                                        }}
                                    />
                                )}

                                {/* Drawing preview - Polygon */}
                                {polygonPoints.length > 0 && (
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                        {polygonPoints.map((p, i) => (
                                            <circle key={i} cx={`${p.x}%`} cy={`${p.y}%`} r="5" fill="#3b82f6" />
                                        ))}
                                        {polygonPoints.length > 1 && (
                                            <polyline
                                                points={polygonPoints.map(p => `${p.x}%,${p.y}%`).join(' ')}
                                                fill="none"
                                                stroke="#3b82f6"
                                                strokeWidth="2"
                                                strokeDasharray="5,5"
                                            />
                                        )}
                                    </svg>
                                )}
                            </div>
                        </div>

                        {/* Sidebar */}
                        <aside className="w-96 bg-white border-l flex flex-col">
                            <div className="p-4 border-b bg-slate-50">
                                <h2 className="font-semibold text-slate-800">
                                    Sources ({currentPageSources.length})
                                </h2>
                            </div>

                            <div className="flex-1 overflow-auto">
                                {currentPageSources.length === 0 ? (
                                    <div className="p-6 text-center text-slate-400">
                                        <p>Draw boxes or polygons to clip sources</p>
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {currentPageSources.map((source, idx) => (
                                            <div
                                                key={source.id}
                                                onClick={() => setSelectedSourceId(source.id)}
                                                className={`p-3 cursor-pointer ${selectedSourceId === source.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                            >
                                                {/* Header */}
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                                            {idx + 1}
                                                        </span>
                                                        <span className="text-xs text-slate-500">
                                                            {source.polygon ? 'Polygon' : 'Rectangle'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); deleteSource(source.id) }}
                                                        className="text-red-500 hover:bg-red-100 rounded p-1"
                                                    >
                                                        ×
                                                    </button>
                                                </div>

                                                {/* CLIPPED IMAGE - Auto generated */}
                                                {source.clippedImage && (
                                                    <div className="bg-slate-100 rounded overflow-hidden mb-2">
                                                        <img
                                                            src={source.clippedImage}
                                                            alt={`Source ${idx + 1}`}
                                                            className="w-full max-h-40 object-contain"
                                                        />
                                                    </div>
                                                )}

                                                {/* ROTATION SLIDER */}
                                                <div className="mb-2">
                                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                                        <span>Rotation</span>
                                                        <span className="font-mono">{source.rotation}°</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="-180"
                                                        max="180"
                                                        step="1"
                                                        value={source.rotation}
                                                        onChange={(e) => updateSourceRotation(source.id, parseInt(e.target.value))}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                                    />
                                                    <div className="flex justify-between text-[10px] text-slate-400">
                                                        <span>-180°</span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); updateSourceRotation(source.id, 0) }}
                                                            className="text-blue-500 hover:underline"
                                                        >
                                                            Reset
                                                        </button>
                                                        <span>180°</span>
                                                    </div>
                                                </div>

                                                {/* Reference input */}
                                                {selectedSourceId === source.id && (
                                                    <div className="mt-2 pt-2 border-t">
                                                        <input
                                                            type="text"
                                                            value={source.reference || ''}
                                                            onChange={(e) => updateSourceReference(source.id, e.target.value)}
                                                            placeholder="Reference (e.g., Bereishit 1:1)"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="w-full text-xs px-2 py-1 border rounded"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </aside>
                    </>
                )}

                {/* PREVIEW STATE - Shows IMAGES not text */}
                {appState === 'preview' && (
                    <div className="flex-1 overflow-auto p-8 bg-white">
                        <div className="max-w-4xl mx-auto">
                            <h1 className="text-3xl font-serif font-bold text-center mb-8 pb-4 border-b">
                                Source Sheet
                            </h1>

                            {sources.length === 0 ? (
                                <p className="text-center text-slate-400 py-12">No sources to display</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {sources.map((source, idx) => (
                                        <div key={source.id} className="border rounded-lg overflow-hidden shadow-sm">
                                            {/* Source number and reference */}
                                            <div className="bg-slate-50 px-4 py-2 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                                        {idx + 1}
                                                    </span>
                                                    {source.reference && (
                                                        <span className="font-medium text-sm">{source.reference}</span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-slate-400">
                                                    Page {source.pageIndex + 1}
                                                </span>
                                            </div>

                                            {/* CLIPPED IMAGE - Primary content */}
                                            {source.clippedImage ? (
                                                <img
                                                    src={source.clippedImage}
                                                    alt={`Source ${idx + 1}`}
                                                    className="w-full"
                                                />
                                            ) : (
                                                <div className="h-32 flex items-center justify-center text-slate-400 bg-slate-100">
                                                    No preview
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Drawing mode hint */}
            {appState === 'editing' && drawMode === 'polygon' && polygonPoints.length === 0 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/75 text-white px-6 py-3 rounded-full text-sm">
                    Click to add points, then click "Finish" to complete the polygon
                </div>
            )}
        </div>
    )
}
