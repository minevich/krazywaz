'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

// ============================================================================
// TYPES
// ============================================================================

interface Source {
    id: string
    pageIndex: number
    box: { x: number; y: number; width: number; height: number } | null
    polygon: Array<{ x: number; y: number }> | null
    rotation: number
    clippedImage: string | null
    name: string
    reference: string | null
    displaySize: number  // Percentage 25-100 for how big to show on shiur page
}

interface PageData {
    imageDataUrl: string
    width: number
    height: number
    imageElement: HTMLImageElement | null
}

interface Shiur {
    id: string
    title: string
    slug: string
    sourceDoc?: string | null
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
        const img = new Image()
        img.src = dataUrl
        await new Promise(resolve => { img.onload = resolve })
        pages.push({ imageDataUrl: dataUrl, width: viewport.width, height: viewport.height, imageElement: img })
    }
    return pages
}

async function convertImageToDataUrl(file: File): Promise<PageData> {
    return new Promise((resolve) => {
        const reader = new FileReader()
        const img = new Image()
        reader.onload = () => {
            img.onload = () => {
                resolve({ imageDataUrl: reader.result as string, width: img.width, height: img.height, imageElement: img })
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
        const sx = (source.box.x / 100) * page.width
        const sy = (source.box.y / 100) * page.height
        const sw = (source.box.width / 100) * page.width
        const sh = (source.box.height / 100) * page.height
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
        return canvas.toDataURL('image/jpeg', 0.7)
    } else if (source.polygon && source.polygon.length >= 3) {
        const points = source.polygon.map(p => ({ x: (p.x / 100) * page.width, y: (p.y / 100) * page.height }))
        const minX = Math.min(...points.map(p => p.x))
        const maxX = Math.max(...points.map(p => p.x))
        const minY = Math.min(...points.map(p => p.y))
        const maxY = Math.max(...points.map(p => p.y))
        canvas.width = maxX - minX
        canvas.height = maxY - minY
        // Fill white background for JPEG
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.beginPath()
        ctx.moveTo(points[0].x - minX, points[0].y - minY)
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x - minX, points[i].y - minY)
        }
        ctx.closePath()
        ctx.clip()
        const angle = (source.rotation * Math.PI) / 180
        ctx.save()
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate(angle)
        ctx.translate(-canvas.width / 2, -canvas.height / 2)
        ctx.drawImage(page.imageElement, minX, minY, maxX - minX, maxY - minY, 0, 0, maxX - minX, maxY - minY)
        ctx.restore()
        return canvas.toDataURL('image/jpeg', 0.7)
    }
    return null
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SourceManager() {
    const [appState, setAppState] = useState<AppState>('upload')
    const [pages, setPages] = useState<PageData[]>([])
    const [sources, setSources] = useState<Source[]>([])
    const [currentPageIndex, setCurrentPageIndex] = useState(0)
    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
    const [statusMessage, setStatusMessage] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [drawMode, setDrawMode] = useState<DrawMode>('rectangle')

    // Rectangle drawing
    const [isDrawing, setIsDrawing] = useState(false)
    const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
    const [drawEnd, setDrawEnd] = useState<{ x: number; y: number } | null>(null)

    // Polygon drawing
    const [polygonPoints, setPolygonPoints] = useState<Array<{ x: number; y: number }>>([])

    // Editing (drag/resize)
    const [editMode, setEditMode] = useState<'none' | 'drag' | 'resize' | 'rotate'>('none')
    const [editingSourceId, setEditingSourceId] = useState<string | null>(null)
    const [editStart, setEditStart] = useState<{ x: number; y: number; box?: { x: number; y: number; width: number; height: number }; rotation?: number } | null>(null)
    const [resizeHandle, setResizeHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null)

    // Shiur attachment
    const [shiurim, setShiurim] = useState<Shiur[]>([])
    const [selectedShiurId, setSelectedShiurId] = useState<string | null>(null)
    const [loadingShiurim, setLoadingShiurim] = useState(false)

    const canvasRef = useRef<HTMLDivElement>(null)
    const imageRef = useRef<HTMLImageElement>(null)

    const searchParams = useSearchParams()

    // Load shiurim list and auto-select if query param exists
    useEffect(() => {
        const loadShiurim = async () => {
            setLoadingShiurim(true)
            try {
                const res = await fetch('/api/shiurim')
                const data = await res.json()
                // API returns array directly, not { shiurim: [...] }
                if (Array.isArray(data)) {
                    const loadedShiurim = data.map((s: any) => ({
                        id: s.id,
                        title: s.title,
                        slug: s.slug,
                        sourceDoc: s.sourceDoc
                    }))
                    setShiurim(loadedShiurim)

                    // Auto-select and load if param exists
                    const paramShiurId = searchParams.get('shiurId')
                    if (paramShiurId) {
                        setSelectedShiurId(paramShiurId)
                        const targetShiur = loadedShiurim.find(s => s.id === paramShiurId)
                        if (targetShiur?.sourceDoc?.startsWith('sources:')) {
                            try {
                                const json = targetShiur.sourceDoc.slice(8)
                                const parsed = JSON.parse(json)
                                let sourcesToLoad = []
                                if (Array.isArray(parsed)) {
                                    sourcesToLoad = parsed
                                } else {
                                    sourcesToLoad = parsed.sources
                                }

                                setSources(sourcesToLoad.map((src: any) => ({
                                    id: src.id || `restored-${Date.now()}`,
                                    pageIndex: 0, // Dummy
                                    box: null,
                                    polygon: null,
                                    rotation: src.rotation || 0,
                                    clippedImage: src.image,
                                    name: src.name,
                                    reference: src.reference,
                                    displaySize: src.displaySize || 75
                                })))
                                setStatusMessage(`Loaded sources from "${targetShiur.title}"`)
                                setAppState('preview') // Go straight to preview/editing
                            } catch (e) {
                                console.error('Failed to parse sources', e)
                            }
                        }
                    }
                } else {
                    console.error('Unexpected shiurim response:', data)
                }
            } catch (e) {
                console.error('Failed to load shiurim:', e)
            }
            setLoadingShiurim(false)
        }
        loadShiurim()
    }, [searchParams])

    // Auto-generate clipped images
    useEffect(() => {
        const updated = sources.map(s => {
            if (!s.clippedImage && (s.box || s.polygon)) {
                const page = pages[s.pageIndex]
                if (page) return { ...s, clippedImage: clipSourceImage(s, page) }
            }
            return s
        })
        const hasChanges = updated.some((s, i) => s.clippedImage !== sources[i].clippedImage)
        if (hasChanges) setSources(updated)
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
                setStatusMessage('Converting PDF...')
                pageData = await convertPdfToImages(file)
            } else {
                setStatusMessage('Loading image...')
                pageData = [await convertImageToDataUrl(file)]
            }
            setPages(pageData)
            setStatusMessage(`Analyzing ${pageData.length} page(s)...`)

            const allSources: Source[] = []
            for (let i = 0; i < pageData.length; i++) {
                setStatusMessage(`Analyzing page ${i + 1}...`)
                const pageSources = await analyzePageWithGemini(pageData[i], i)
                allSources.push(...pageSources)
            }

            for (const source of allSources) {
                source.clippedImage = clipSourceImage(source, pageData[source.pageIndex])
            }

            setSources(allSources)
            setStatusMessage(allSources.length > 0 ? `Found ${allSources.length} sources` : 'Draw sources manually')
            setAppState('editing')
        } catch (err) {
            setError(String(err))
            setAppState('upload')
        }
    }

    const analyzePageWithGemini = async (page: PageData, pageIndex: number): Promise<Source[]> => {
        try {
            const response = await fetch(page.imageDataUrl)
            const blob = await response.blob()
            const file = new File([blob], 'page.png', { type: 'image/png' })
            const formData = new FormData()
            formData.append('image', file)

            const res = await fetch('/api/sources/analyze', { method: 'POST', body: formData })
            const data = await res.json() as { success: boolean; sources?: Array<{ id?: string; box: { x: number; y: number; width: number; height: number }; text?: string; reference?: string | null }> }

            if (data.success && data.sources?.length) {
                return data.sources.map((s, idx) => ({
                    id: s.id || `src-${Date.now()}-${idx}`,
                    pageIndex,
                    box: s.box,
                    polygon: null,
                    rotation: 0,
                    clippedImage: null,
                    name: s.reference || `Source ${idx + 1}`,
                    reference: s.reference || null,
                    displaySize: 75
                }))
            }
            return []
        } catch { return [] }
    }

    // ============================================================================
    // SOURCE MANAGEMENT
    // ============================================================================

    const deleteSource = (id: string) => {
        setSources(prev => prev.filter(s => s.id !== id))
        if (selectedSourceId === id) setSelectedSourceId(null)
    }

    const updateSourceName = (id: string, name: string) => {
        setSources(prev => prev.map(s => s.id === id ? { ...s, name } : s))
    }

    const updateSourceRotation = (id: string, rotation: number) => {
        setSources(prev => prev.map(s => s.id === id ? { ...s, rotation, clippedImage: null } : s))
    }

    const updateSourceSize = (id: string, size: number) => {
        setSources(prev => prev.map(s => s.id === id ? { ...s, displaySize: size } : s))
    }

    const clearPage = () => {
        setSources(prev => prev.filter(s => s.pageIndex !== currentPageIndex))
    }

    const applyQuickGrid = (rows: number) => {
        const rowHeight = 90 / rows
        const newSources: Source[] = []
        for (let i = 0; i < rows; i++) {
            newSources.push({
                id: `grid-${Date.now()}-${i}`,
                pageIndex: currentPageIndex,
                box: { x: 5, y: 5 + i * rowHeight, width: 90, height: rowHeight },
                polygon: null,
                rotation: 0,
                clippedImage: null,
                name: `Source ${i + 1}`,
                reference: null,
                displaySize: 75
            })
        }
        setSources(prev => [...prev.filter(s => s.pageIndex !== currentPageIndex), ...newSources])
    }

    // ============================================================================
    // DRAWING / EDITING
    // ============================================================================

    const getPos = (e: React.MouseEvent) => {
        // Use the image element directly for accurate positioning
        if (!imageRef.current) return { x: 0, y: 0 }
        const rect = imageRef.current.getBoundingClientRect()
        return {
            x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
            y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
        }
    }

    const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (drawMode === 'polygon' && appState === 'editing') {
            setPolygonPoints(prev => [...prev, getPos(e)])
        }
    }

    const finishPolygon = () => {
        if (polygonPoints.length >= 3) {
            setSources(prev => [...prev, {
                id: `poly-${Date.now()}`,
                pageIndex: currentPageIndex,
                box: null,
                polygon: [...polygonPoints],
                rotation: 0,
                clippedImage: null,
                name: `Polygon ${prev.length + 1}`,
                reference: null,
                displaySize: 75
            }])
        }
        setPolygonPoints([])
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (appState !== 'editing' || drawMode !== 'rectangle' || editMode !== 'none') return
        e.preventDefault() // Prevent text selection
        const pos = getPos(e)
        setIsDrawing(true)
        setDrawStart(pos)
        setDrawEnd(pos)
        setSelectedSourceId(null)
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const pos = getPos(e)

        // Rotating - with damping for less sensitivity
        if (editMode === 'rotate' && editingSourceId && editStart) {
            const source = sources.find(s => s.id === editingSourceId)
            if (source?.box) {
                const centerX = source.box.x + source.box.width / 2
                const centerY = source.box.y + source.box.height / 2
                const rawAngle = Math.atan2(pos.y - centerY, pos.x - centerX) * (180 / Math.PI)
                // Add 90 degrees offset so 0° is at top, and dampen to 2° steps
                const adjustedAngle = rawAngle + 90
                const snappedAngle = Math.round(adjustedAngle / 2) * 2
                // Normalize to -180 to 180
                const normalizedAngle = ((snappedAngle + 180) % 360) - 180
                updateSourceRotation(editingSourceId, normalizedAngle)
            }
            return
        }

        // Dragging
        if (editMode === 'drag' && editingSourceId && editStart?.box) {
            const dx = pos.x - editStart.x
            const dy = pos.y - editStart.y
            setSources(prev => prev.map(s => {
                if (s.id !== editingSourceId || !s.box) return s
                return {
                    ...s,
                    box: {
                        ...s.box,
                        x: Math.max(0, Math.min(100 - editStart.box!.width, editStart.box!.x + dx)),
                        y: Math.max(0, Math.min(100 - editStart.box!.height, editStart.box!.y + dy))
                    },
                    clippedImage: null
                }
            }))
            return
        }

        // Resizing
        if (editMode === 'resize' && editingSourceId && editStart?.box && resizeHandle) {
            const dx = pos.x - editStart.x
            const dy = pos.y - editStart.y
            setSources(prev => prev.map(s => {
                if (s.id !== editingSourceId || !s.box) return s
                let { x, y, width, height } = editStart.box!
                if (resizeHandle.includes('w')) { x += dx; width -= dx }
                if (resizeHandle.includes('e')) { width += dx }
                if (resizeHandle.includes('n')) { y += dy; height -= dy }
                if (resizeHandle.includes('s')) { height += dy }
                return { ...s, box: { x: Math.max(0, x), y: Math.max(0, y), width: Math.max(5, width), height: Math.max(5, height) }, clippedImage: null }
            }))
            return
        }

        if (isDrawing) setDrawEnd(pos)
    }

    const handleMouseUp = () => {
        if (editMode !== 'none') {
            setEditMode('none')
            setEditingSourceId(null)
            setEditStart(null)
            setResizeHandle(null)
            return
        }

        if (!isDrawing || !drawStart || !drawEnd) { setIsDrawing(false); return }

        const x = Math.min(drawStart.x, drawEnd.x)
        const y = Math.min(drawStart.y, drawEnd.y)
        const width = Math.abs(drawEnd.x - drawStart.x)
        const height = Math.abs(drawEnd.y - drawStart.y)

        if (width > 3 && height > 3) {
            setSources(prev => [...prev, {
                id: `rect-${Date.now()}`,
                pageIndex: currentPageIndex,
                box: { x, y, width, height },
                polygon: null,
                rotation: 0,
                clippedImage: null,
                name: `Source ${prev.length + 1}`,
                reference: null,
                displaySize: 75
            }])
        }
        setIsDrawing(false)
        setDrawStart(null)
        setDrawEnd(null)
    }

    const startDrag = (e: React.MouseEvent, source: Source) => {
        if (!source.box) return
        e.stopPropagation()
        e.preventDefault() // Prevent text selection
        setEditMode('drag')
        setEditingSourceId(source.id)
        setEditStart({ ...getPos(e), box: { ...source.box } })
        setSelectedSourceId(source.id)
    }

    const startResize = (e: React.MouseEvent, source: Source, handle: 'nw' | 'ne' | 'sw' | 'se') => {
        if (!source.box) return
        e.stopPropagation()
        e.preventDefault() // Prevent text selection
        setEditMode('resize')
        setResizeHandle(handle)
        setEditingSourceId(source.id)
        setEditStart({ ...getPos(e), box: { ...source.box } })
        setSelectedSourceId(source.id)
    }

    const startRotate = (e: React.MouseEvent, source: Source) => {
        e.stopPropagation()
        e.preventDefault() // Prevent text selection
        setEditMode('rotate')
        setEditingSourceId(source.id)
        setEditStart({ ...getPos(e), rotation: source.rotation })
        setSelectedSourceId(source.id)
    }

    const currentPageSources = sources.filter(s => s.pageIndex === currentPageIndex)

    // ============================================================================
    // APPLY TO SHIUR
    // ============================================================================

    const [saving, setSaving] = useState(false)

    const applyToShiur = async () => {
        if (!selectedShiurId) {
            alert('Please select a shiur first')
            return
        }

        setSaving(true)
        setStatusMessage('Generating source sheet...')

        try {
            // Find existing original URL if any
            const shiur = shiurim.find(s => s.id === selectedShiurId)
            let originalUrl = null

            if (shiur?.sourceDoc) {
                if (shiur.sourceDoc.startsWith('sources:')) {
                    try {
                        const parsed = JSON.parse(shiur.sourceDoc.slice(8))
                        if (!Array.isArray(parsed)) {
                            originalUrl = parsed.originalUrl
                        }
                    } catch { }
                } else {
                    // It's a raw URL (legacy or initial upload)
                    originalUrl = shiur.sourceDoc
                }
            }

            // Generate source data
            const sourceData = sources.map((source) => ({
                id: source.id,
                name: source.name,
                image: source.clippedImage,
                rotation: source.rotation,
                reference: source.reference,
                displaySize: source.displaySize || 75
            }))

            // Save as JSON object with sources AND originalUrl
            const payload = {
                sources: sourceData,
                originalUrl: originalUrl
            }

            // Prefix "sources:" to identify this is our new format
            const sourceDocJson = 'sources:' + JSON.stringify(payload)

            setStatusMessage('Uploading to shiur...')

            const res = await fetch(`/api/shiurim/${selectedShiurId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceDoc: sourceDocJson
                })
            })

            if (!res.ok) {
                const errData = await res.json() as { error?: string }
                throw new Error(errData.error || 'Failed to update shiur')
            }

            setStatusMessage(`✓ Applied to "${shiur?.title}"`)
            alert(`Source sheet successfully applied to "${shiur?.title}"!\n\nThe sources have been saved and will display on the shiur page.`)

        } catch (err) {
            console.error('Failed to apply:', err)
            alert(`Error: ${err instanceof Error ? err.message : String(err)}`)
            setStatusMessage('Failed to apply')
        }

        setSaving(false)
    }

    // ============================================================================
    // RENDER
    // ============================================================================

    return (
        <div className="h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
            {/* MINIMAL HEADER */}
            <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-30">
                <div className="flex items-center gap-4">
                    <h1 className="text-sm font-bold uppercase tracking-widest text-slate-400">Clipper</h1>
                    {/* View Switcher */}
                    {pages.length > 0 && (
                        <div className="flex bg-slate-100 rounded-lg p-1">
                            <button
                                onClick={() => setAppState('editing')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${appState === 'editing' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Edit (Canvas)
                            </button>
                            <button
                                onClick={() => setAppState('preview')}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${appState === 'preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Organize & Save
                            </button>
                        </div>
                    )}
                </div>

                {pages.length > 0 && (
                    <div className="flex items-center gap-3">
                        {statusMessage && <span className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full animate-pulse">{statusMessage}</span>}

                        {/* Page Navigation */}
                        <div className="flex items-center gap-2 bg-white border rounded-lg px-2 py-1 text-sm shadow-sm">
                            <button onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))} disabled={currentPageIndex === 0} className="px-2 text-slate-400 hover:text-slate-700 disabled:opacity-30">←</button>
                            <span className="min-w-[3rem] text-center font-mono text-slate-600">{currentPageIndex + 1} / {pages.length}</span>
                            <button onClick={() => setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))} disabled={currentPageIndex === pages.length - 1} className="px-2 text-slate-400 hover:text-slate-700 disabled:opacity-30">→</button>
                        </div>
                    </div>
                )}
            </header>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* UPLOAD SCREEN */}
                {appState === 'upload' && (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div
                            onClick={() => document.getElementById('file-input')?.click()}
                            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f) }}
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-500', 'bg-blue-50/50') }}
                            onDragLeave={(e) => { e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50/50') }}
                            className="bg-white max-w-xl w-full border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center cursor-pointer transition-all hover:border-blue-400 hover:shadow-lg hover:-translate-y-1 group"
                        >
                            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-inner">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Upload Source Material</h2>
                            <p className="text-slate-500 mb-8">Drop your PDF or image here to start clipping</p>

                            <button className="bg-slate-900 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all transform active:scale-95">
                                Select File
                            </button>

                            {error && (
                                <div className="mt-8 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-medium">
                                    {error}
                                </div>
                            )}
                            <input id="file-input" type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f) }} />
                        </div>
                    </div>
                )}

                {/* PROCESSING SPINNER */}
                {appState === 'processing' && (
                    <div className="flex-1 flex items-center justify-center bg-white">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-slate-500 font-medium animate-pulse">{statusMessage}</p>
                        </div>
                    </div>
                )}

                {/* EDITING CANVAS */}
                {appState === 'editing' && pages.length > 0 && (
                    <>
                        <div className="flex-1 overflow-auto bg-slate-100 flex justify-center p-8 relative">
                            {/* FLOATING TOOLBAR */}
                            <div className="absolute top-6 left-6 flex flex-col gap-2 bg-white/90 backdrop-blur shadow-xl border border-slate-200 p-2 rounded-2xl z-40">
                                <button
                                    onClick={() => { setDrawMode('rectangle'); setPolygonPoints([]) }}
                                    className={`p-3 rounded-xl transition-all ${drawMode === 'rectangle' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                                    title="Rectangle Tool"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} /></svg>
                                </button>
                                <button
                                    onClick={() => setDrawMode('polygon')}
                                    className={`p-3 rounded-xl transition-all ${drawMode === 'polygon' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                                    title="Polygon Tool"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.16 19.34L3.6 13.9a2 2 0 010-3.32l2.56-5.44a2 2 0 012.38-1.5l5.96 1.48a2 2 0 011.46 1.46l1.48 5.96a2 2 0 01-1.5 2.38l-5.44 2.56a2 2 0 01-3.32 0z" /></svg>
                                </button>

                                <div className="h-px bg-slate-200 my-1 mx-2" />

                                <div className="relative group">
                                    <button className="p-3 rounded-xl text-slate-500 hover:bg-slate-100 transition-all" title="Quick Grid">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                                    </button>
                                    <div className="absolute left-full top-0 ml-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden hidden group-hover:block w-32">
                                        {[2, 3, 4, 5, 6].map(n => (
                                            <button key={n} onClick={() => applyQuickGrid(n)} className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-slate-600">{n} Rows</button>
                                        ))}
                                    </div>
                                </div>

                                <button onClick={clearPage} className="p-3 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Clear Page">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>

                            {/* POLYGON CONTROLS (Only when active) */}
                            {drawMode === 'polygon' && polygonPoints.length > 0 && (
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-full shadow-xl z-40 transform hover:scale-105 transition-all">
                                    <span className="text-sm font-medium border-r border-slate-700 pr-3 mr-1">{polygonPoints.length} pts</span>
                                    <button onClick={finishPolygon} disabled={polygonPoints.length < 3} className="hover:text-green-400 disabled:opacity-50 font-bold px-2">Complete ✓</button>
                                    <button onClick={() => setPolygonPoints([])} className="hover:text-red-400 font-bold px-2">Cancel ✕</button>
                                </div>
                            )}

                            {/* CANVAS ITSELF */}
                            <div
                                ref={canvasRef}
                                className="relative inline-block cursor-crosshair select-none shadow-2xl rounded-lg overflow-hidden ring-1 ring-black/5"
                                style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                                onClick={handleCanvasClick}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            >
                                <img ref={imageRef} src={pages[currentPageIndex].imageDataUrl} alt="Page" className="max-h-[calc(100vh-140px)] pointer-events-none select-none" draggable={false} />

                                {/* Render sources */}
                                {currentPageSources.map((source, idx) => {
                                    if (source.box) {
                                        const isSelected = selectedSourceId === source.id
                                        return (
                                            <div
                                                key={source.id}
                                                onClick={(e) => { e.stopPropagation(); setSelectedSourceId(source.id) }}
                                                className={`absolute border-2 transition-colors ${isSelected ? 'border-blue-500 bg-blue-500/10 z-20' : 'border-blue-400/50 hover:border-blue-400 hover:bg-blue-400/5'}`}
                                                style={{
                                                    left: `${source.box.x}%`, top: `${source.box.y}%`,
                                                    width: `${source.box.width}%`, height: `${source.box.height}%`,
                                                    transform: source.rotation ? `rotate(${source.rotation}deg)` : undefined,
                                                    transformOrigin: 'center'
                                                }}
                                            >
                                                {/* Number Badge */}
                                                <div className="absolute -top-3 -left-3 w-6 h-6 bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center justify-center shadow-md transform scale-90 group-hover:scale-100 transition-transform">
                                                    {idx + 1}
                                                </div>

                                                {/* Delete Button (On Hover/Selected) */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteSource(source.id) }}
                                                    className={`absolute -top-3 -right-3 w-6 h-6 bg-white border border-slate-200 text-red-500 rounded-full shadow-md flex items-center justify-center hover:bg-red-50 transition-all ${isSelected ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}
                                                >
                                                    ×
                                                </button>

                                                {/* Controls for Selected Source */}
                                                {isSelected && (
                                                    <>
                                                        {/* Rotation Handle */}
                                                        <div
                                                            onMouseDown={(e) => startRotate(e, source)}
                                                            className="absolute -top-10 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border border-slate-200 rounded-full cursor-grab flex items-center justify-center text-slate-600 shadow-lg hover:bg-slate-50 hover:border-blue-300"
                                                            title="Rotate"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                        </div>
                                                        {/* Connector line */}
                                                        <div className="absolute -top-2 left-1/2 w-px h-8 bg-blue-500/50 border-l border-dashed border-blue-300 pointer-events-none" />

                                                        {/* Resize handles */}
                                                        <div onMouseDown={(e) => startResize(e, source, 'nw')} className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-nw-resize shadow-sm" />
                                                        <div onMouseDown={(e) => startResize(e, source, 'ne')} className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-ne-resize shadow-sm" />
                                                        <div onMouseDown={(e) => startResize(e, source, 'sw')} className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-sw-resize shadow-sm" />
                                                        <div onMouseDown={(e) => startResize(e, source, 'se')} className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-500 rounded-full cursor-se-resize shadow-sm" />
                                                    </>
                                                )}

                                                {/* Drag Surface */}
                                                {isSelected && <div onMouseDown={(e) => startDrag(e, source)} className="absolute inset-0 cursor-move bg-transparent" />}
                                            </div>
                                        )
                                    } else if (source.polygon && source.polygon.length >= 3) {
                                        return (
                                            <svg key={source.id} className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: source.rotation ? `rotate(${source.rotation}deg)` : undefined }}>
                                                <polygon
                                                    points={source.polygon.map(p => `${p.x},${p.y}`).join(' ')}
                                                    fill={selectedSourceId === source.id ? 'rgba(37, 99, 235, 0.2)' : 'rgba(37, 99, 235, 0.1)'}
                                                    stroke={selectedSourceId === source.id ? '#2563eb' : '#60a5fa'}
                                                    strokeWidth="0.5" // Scaled for 100x100 box
                                                    vectorEffect="non-scaling-stroke"
                                                    className="pointer-events-auto cursor-pointer hover:fill-blue-500/20"
                                                    onClick={() => setSelectedSourceId(source.id)}
                                                />
                                            </svg>
                                        )
                                    }
                                    return null
                                })}

                                {/* Draw Preview - Rect */}
                                {isDrawing && drawStart && drawEnd && (
                                    <div className="absolute border font-thin border-blue-500 bg-blue-500/10 pointer-events-none" style={{
                                        left: `${Math.min(drawStart.x, drawEnd.x)}%`, top: `${Math.min(drawStart.y, drawEnd.y)}%`,
                                        width: `${Math.abs(drawEnd.x - drawStart.x)}%`, height: `${Math.abs(drawEnd.y - drawStart.y)}%`
                                    }} />
                                )}

                                {/* Draw Preview - Poly */}
                                {polygonPoints.length > 0 && (
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        {polygonPoints.length > 1 && (
                                            <polyline points={polygonPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#2563eb" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                                        )}
                                        {polygonPoints.map((p, i) => (
                                            <circle key={i} cx={p.x} cy={p.y} r="0.6" fill="white" stroke="#2563eb" strokeWidth="0.2" vectorEffect="non-scaling-stroke" />
                                        ))}
                                        {polygonPoints.length >= 3 && (
                                            <line x1={polygonPoints[polygonPoints.length - 1].x} y1={polygonPoints[polygonPoints.length - 1].y} x2={polygonPoints[0].x} y2={polygonPoints[0].y} stroke="#2563eb" strokeWidth="0.5" strokeDasharray="1,1" vectorEffect="non-scaling-stroke" />
                                        )}
                                    </svg>
                                )}
                            </div>
                        </div>

                        {/* SIDEBAR - Current Page Sources */}
                        <aside className="w-72 bg-white border-l border-slate-200 flex flex-col z-10 shadow-sm">
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <h3 className="font-semibold text-slate-700 text-sm">Page {currentPageIndex + 1} Sources</h3>
                                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md text-xs font-bold">{currentPageSources.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                {currentPageSources.map((source, idx) => (
                                    <div
                                        key={source.id}
                                        onClick={() => setSelectedSourceId(source.id)}
                                        className={`group relative p-2 rounded-xl border cursor-pointer transition-all ${selectedSourceId === source.id ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-100' : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {source.clippedImage ? (
                                                <div className="w-16 h-16 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex-shrink-0">
                                                    <img src={source.clippedImage} className="w-full h-full object-contain" />
                                                </div>
                                            ) : (
                                                <div className="w-16 h-16 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center text-slate-300">
                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0 pt-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="bg-slate-900 text-white w-5 h-5 text-[10px] font-bold rounded flex items-center justify-center">{idx + 1}</span>
                                                    <span className="text-sm font-medium text-slate-700 truncate">{source.name}</span>
                                                </div>
                                                <p className="text-xs text-slate-400">
                                                    {source.rotation}° • {source.displaySize || 75}%
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteSource(source.id) }}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity absolute top-2 right-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {currentPageSources.length === 0 && (
                                    <div className="text-center py-12 px-4">
                                        <p className="text-sm text-slate-400">No sources on this page.</p>
                                        <p className="text-xs text-slate-300 mt-1">Use the tools to draw boxes.</p>
                                    </div>
                                )}
                            </div>
                        </aside>
                    </>
                )}

                {/* ORGANIZER / PREVIEW MODE */}
                {appState === 'preview' && (
                    <div className="flex-1 overflow-auto bg-slate-50">
                        <div className="max-w-5xl mx-auto p-8">

                            <div className="flex flex-col md:flex-row md:items-start gap-8">
                                {/* LIST COLUMN */}
                                <div className="flex-1 space-y-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xl font-bold text-slate-800">Review clips ({sources.length})</h2>
                                        <button onClick={() => setAppState('editing')} className="text-sm text-blue-600 hover:underline">← Back to Edit</button>
                                    </div>

                                    {sources.length === 0 ? (
                                        <div className="bg-white border text-center p-12 rounded-xl text-slate-400">No sources clipped yet.</div>
                                    ) : (
                                        <div className="space-y-4">
                                            {sources.map((source, idx) => (
                                                <div key={source.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex gap-6 items-start hover:shadow-md transition-shadow">
                                                    {/* Number */}
                                                    <div className="flex-shrink-0 w-8 h-8 bg-slate-100 text-slate-600 font-bold rounded-lg flex items-center justify-center border border-slate-200">
                                                        {idx + 1}
                                                    </div>

                                                    {/* Controls */}
                                                    <div className="flex-1 space-y-4">
                                                        <div>
                                                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Title</label>
                                                            <input
                                                                type="text"
                                                                value={source.name}
                                                                onChange={(e) => updateSourceName(source.id, e.target.value)}
                                                                className="w-full text-lg font-medium text-slate-800 placeholder-slate-300 border-b border-transparent focus:border-blue-500 focus:outline-none transition-colors pb-1"
                                                                placeholder="Enter title..."
                                                            />
                                                        </div>

                                                        <div className="flex items-center gap-6">
                                                            <div className="flex-1">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <label className="text-xs font-medium text-slate-500">Display Size</label>
                                                                    <span className="text-xs font-mono text-slate-400">{source.displaySize || 75}%</span>
                                                                </div>
                                                                <input
                                                                    type="range"
                                                                    min="25" max="100" step="5"
                                                                    value={source.displaySize || 75}
                                                                    onChange={(e) => updateSourceSize(source.id, parseInt(e.target.value))}
                                                                    className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-slate-900"
                                                                />
                                                            </div>

                                                            <div className="w-px h-8 bg-slate-100"></div>

                                                            <div>
                                                                <label className="block text-xs font-medium text-slate-500 mb-1">Rotation</label>
                                                                <div className="flex items-center gap-1">
                                                                    <button onClick={() => updateSourceRotation(source.id, (source.rotation || 0) - 90)} className="p-1 hover:bg-slate-100 rounded text-slate-400">↺</button>
                                                                    <span className="w-8 text-center text-sm font-mono text-slate-600">{source.rotation}°</span>
                                                                    <button onClick={() => updateSourceRotation(source.id, (source.rotation || 0) + 90)} className="p-1 hover:bg-slate-100 rounded text-slate-400">↻</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Preview Image */}
                                                    <div className="w-32 bg-slate-50 p-2 rounded border border-slate-100 flex items-center justify-center">
                                                        {source.clippedImage ? (
                                                            <img src={source.clippedImage} className="max-w-full max-h-24 shadow-sm" style={{ transform: `rotate(${source.rotation}deg)` }} />
                                                        ) : (
                                                            <span className="text-xs text-slate-400">No Img</span>
                                                        )}
                                                    </div>

                                                    {/* Delete */}
                                                    <button onClick={() => deleteSource(source.id)} className="text-slate-300 hover:text-red-500 p-1">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* ACTION SIDEBAR */}
                                <div className="w-full md:w-80 space-y-6 sticky top-6">
                                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                        <h3 className="font-bold text-slate-800 mb-4">Finalize</h3>
                                        <p className="text-sm text-slate-500 mb-6">Select a shiur to attach these sources to. This will update the shiur page immediately.</p>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Shiur</label>
                                                <select
                                                    value={selectedShiurId || ''}
                                                    onChange={(e) => setSelectedShiurId(e.target.value || null)}
                                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                >
                                                    <option value="">Select a shiur...</option>
                                                    {shiurim.map(s => (
                                                        <option key={s.id} value={s.id}>
                                                            {s.title}
                                                        </option>
                                                    ))}
                                                </select>
                                                {selectedShiurId && shiurim.find(s => s.id === selectedShiurId)?.sourceDoc?.startsWith('sources:') && (
                                                    <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded border border-amber-100">
                                                        Note: This shiur already has clipped sources. Applying will overwrite them.
                                                    </p>
                                                )}
                                            </div>

                                            <button
                                                onClick={applyToShiur}
                                                disabled={!selectedShiurId || saving || sources.length === 0}
                                                className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold shadow-lg shadow-slate-200 hover:bg-slate-800 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
                                            >
                                                {saving ? 'Saving...' : 'Save Source Sheet'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
