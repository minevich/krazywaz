'use client'

import { useState, useCallback, useRef, MouseEvent } from 'react'
import { Upload, Loader2, X, Save, Trash2, Square, Scissors, Move, RotateCcw, Server, AlertCircle } from 'lucide-react'

interface Source {
    id: string
    pageIndex: number
    x: number
    y: number
    width: number
    height: number
}

type Tool = 'select' | 'draw' | 'slice'

// Python service URL - can be configured
const PYTHON_SERVICE_URL = process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL || 'http://localhost:5000'

export default function SourceManager() {
    const [file, setFile] = useState<File | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [sources, setSources] = useState<Source[]>([])
    const [pageImages, setPageImages] = useState<string[]>([])
    const [selectedSource, setSelectedSource] = useState<string | null>(null)
    const [activeTool, setActiveTool] = useState<Tool>('draw')
    const [currentPage, setCurrentPage] = useState(0)
    const [serviceStatus, setServiceStatus] = useState<'unknown' | 'online' | 'offline'>('unknown')
    const [analysisLog, setAnalysisLog] = useState<string[]>([])

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false)
    const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
    const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null)

    const addLog = (msg: string) => {
        setAnalysisLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
    }

    const checkService = async () => {
        try {
            const res = await fetch(`${PYTHON_SERVICE_URL}/health`, { mode: 'cors' })
            if (res.ok) {
                setServiceStatus('online')
                addLog('Python service is ONLINE')
                return true
            }
        } catch (e) {
            setServiceStatus('offline')
            addLog('Python service is OFFLINE - using fallback')
        }
        return false
    }

    const analyzeWithPython = async (imageFile: File): Promise<Source[]> => {
        addLog(`Sending to Python service: ${imageFile.name}`)

        const formData = new FormData()
        formData.append('file', imageFile)

        const res = await fetch(`${PYTHON_SERVICE_URL}/analyze`, {
            method: 'POST',
            body: formData,
            mode: 'cors'
        })

        if (!res.ok) {
            throw new Error(`Service returned ${res.status}`)
        }

        const data = await res.json() as { count: number; regions: any[] }
        addLog(`Python found ${data.count} regions`)

        if (!data.regions || data.regions.length === 0) {
            return []
        }

        return data.regions.map((r: any, idx: number) => {
            const [ymin, xmin, ymax, xmax] = r.box_2d
            return {
                id: crypto.randomUUID(),
                pageIndex: 0, // Will be set by caller
                x: xmin / 10,
                y: ymin / 10,
                width: (xmax - xmin) / 10,
                height: (ymax - ymin) / 10
            }
        })
    }

    const processFile = async (f: File) => {
        setIsProcessing(true)
        setSources([])
        setPageImages([])
        setAnalysisLog([])
        addLog('Starting processing...')

        try {
            // Check Python service
            const serviceOnline = await checkService()

            if (!serviceOnline) {
                addLog('Python service is offline!')
                alert('Python service is not running. Please start it with: python python-service/server.py')
                setIsProcessing(false)
                return
            }

            addLog(`Sending ${f.name} to Python service...`)

            const formData = new FormData()
            formData.append('file', f)

            const res = await fetch(`${PYTHON_SERVICE_URL}/analyze`, {
                method: 'POST',
                body: formData,
                mode: 'cors'
            })

            if (!res.ok) {
                throw new Error(`Service returned ${res.status}`)
            }

            const data = await res.json() as any
            addLog(`Response received: ${data.isPDF ? 'PDF' : 'Image'}`)

            const newPageImages: string[] = []
            const newSources: Source[] = []

            if (data.isPDF && data.pages) {
                // Handle multi-page PDF response
                addLog(`Processing ${data.totalPages} pages...`)

                for (let i = 0; i < data.pages.length; i++) {
                    const page = data.pages[i]
                    newPageImages.push(page.image)

                    if (page.regions && page.regions.length > 0) {
                        page.regions.forEach((r: any, idx: number) => {
                            const [ymin, xmin, ymax, xmax] = r.box_2d
                            newSources.push({
                                id: crypto.randomUUID(),
                                pageIndex: i,
                                x: xmin / 10,
                                y: ymin / 10,
                                width: (xmax - xmin) / 10,
                                height: (ymax - ymin) / 10
                            })
                        })
                        addLog(`Page ${i + 1}: Found ${page.regions.length} sources`)
                    } else {
                        newSources.push({
                            id: crypto.randomUUID(),
                            pageIndex: i,
                            x: 0, y: 0, width: 100, height: 100
                        })
                        addLog(`Page ${i + 1}: No sources found, using full page`)
                    }
                }
            } else {
                // Single image response
                newPageImages.push(data.image)

                if (data.regions && data.regions.length > 0) {
                    data.regions.forEach((r: any) => {
                        const [ymin, xmin, ymax, xmax] = r.box_2d
                        newSources.push({
                            id: crypto.randomUUID(),
                            pageIndex: 0,
                            x: xmin / 10,
                            y: ymin / 10,
                            width: (xmax - xmin) / 10,
                            height: (ymax - ymin) / 10
                        })
                    })
                    addLog(`Found ${data.regions.length} sources`)
                } else {
                    newSources.push({
                        id: crypto.randomUUID(),
                        pageIndex: 0,
                        x: 0, y: 0, width: 100, height: 100
                    })
                    addLog('No sources found, using full page')
                }
            }

            setPageImages(newPageImages)
            setSources(newSources)
            setCurrentPage(0)
            addLog(`Done! Found ${newSources.length} sources total`)

        } catch (e) {
            addLog(`Error: ${e}`)
            alert('Error: ' + e)
        } finally {
            setIsProcessing(false)
        }
    }

    const pdfToImages = async (pdfFile: File): Promise<{ dataUrl: string; file: File }[]> => {
        // Dynamic import with proper destructuring
        const pdfjs = await import('pdfjs-dist')
        const pdfjsLib = pdfjs.default || pdfjs

        // Set worker
        if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        }

        const arrayBuffer = await pdfFile.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const results: { dataUrl: string; file: File }[] = []

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const viewport = page.getViewport({ scale: 2 })
            const canvas = document.createElement('canvas')
            canvas.width = viewport.width
            canvas.height = viewport.height
            const ctx = canvas.getContext('2d')!

            await page.render({
                canvasContext: ctx,
                viewport,
                canvas
            } as any).promise

            const dataUrl = canvas.toDataURL('image/png')
            const blob = await new Promise<Blob>((r) => canvas.toBlob(b => r(b!), 'image/png'))
            const file = new File([blob], `page-${i}.png`, { type: 'image/png' })

            results.push({ dataUrl, file })
        }
        return results
    }

    const fileToDataUrl = (f: File): Promise<string> =>
        new Promise(r => { const reader = new FileReader(); reader.onload = () => r(reader.result as string); reader.readAsDataURL(f) })

    const getRelativePos = (e: MouseEvent<HTMLDivElement>): { x: number; y: number } => {
        const rect = e.currentTarget.getBoundingClientRect()
        return {
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100
        }
    }

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        if (activeTool !== 'draw') return
        const pos = getRelativePos(e)
        setIsDrawing(true)
        setDrawStart(pos)
        setDrawCurrent(pos)
    }

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!isDrawing || activeTool !== 'draw') return
        setDrawCurrent(getRelativePos(e))
    }

    const handleMouseUp = () => {
        if (!isDrawing || !drawStart || !drawCurrent) {
            setIsDrawing(false)
            return
        }

        const x = Math.min(drawStart.x, drawCurrent.x)
        const y = Math.min(drawStart.y, drawCurrent.y)
        const width = Math.abs(drawCurrent.x - drawStart.x)
        const height = Math.abs(drawCurrent.y - drawStart.y)

        if (width > 2 && height > 2) {
            const newSource: Source = {
                id: crypto.randomUUID(),
                pageIndex: currentPage,
                x, y, width, height
            }
            setSources(prev => [...prev, newSource])
        }

        setIsDrawing(false)
        setDrawStart(null)
        setDrawCurrent(null)
    }

    const handleSliceClick = (e: MouseEvent<HTMLDivElement>) => {
        if (activeTool !== 'slice') return
        const pos = getRelativePos(e)

        const target = sources.find(s =>
            s.pageIndex === currentPage &&
            pos.x >= s.x && pos.x <= s.x + s.width &&
            pos.y >= s.y && pos.y <= s.y + s.height
        )

        if (target) {
            const relativeY = pos.y - target.y
            if (relativeY < 3 || target.height - relativeY < 3) return

            const topPart: Source = { ...target, height: relativeY }
            const bottomPart: Source = {
                id: crypto.randomUUID(),
                pageIndex: currentPage,
                x: target.x,
                y: target.y + relativeY,
                width: target.width,
                height: target.height - relativeY
            }

            setSources(prev => prev.map(s => s.id === target.id ? topPart : s).concat(bottomPart))
        }
    }

    const deleteSource = (id: string) => {
        setSources(prev => prev.filter(s => s.id !== id))
        if (selectedSource === id) setSelectedSource(null)
    }

    const currentSources = sources.filter(s => s.pageIndex === currentPage)

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            {/* Top Bar */}
            <div className="bg-white border-b px-4 py-2 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <h1 className="font-bold text-gray-800">Source Extractor</h1>

                    {/* Service Status */}
                    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${serviceStatus === 'online' ? 'bg-green-100 text-green-700' :
                        serviceStatus === 'offline' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-500'
                        }`}>
                        <Server className="w-3 h-3" />
                        {serviceStatus === 'online' ? 'Python Online' :
                            serviceStatus === 'offline' ? 'Python Offline' :
                                'Checking...'}
                    </div>

                    {pageImages.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                            <button
                                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                                disabled={currentPage === 0}
                                className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
                            >←</button>
                            <span className="text-gray-600">Page {currentPage + 1} / {pageImages.length}</span>
                            <button
                                onClick={() => setCurrentPage(Math.min(pageImages.length - 1, currentPage + 1))}
                                disabled={currentPage === pageImages.length - 1}
                                className="px-2 py-1 bg-gray-200 rounded disabled:opacity-50"
                            >→</button>
                        </div>
                    )}
                </div>

                {pageImages.length > 0 && (
                    <div className="flex items-center gap-2">
                        <div className="flex bg-gray-200 rounded-lg p-1 gap-1">
                            <button
                                onClick={() => setActiveTool('select')}
                                className={`p-2 rounded ${activeTool === 'select' ? 'bg-white shadow' : 'hover:bg-gray-300'}`}
                                title="Select"
                            ><Move className="w-4 h-4" /></button>
                            <button
                                onClick={() => setActiveTool('draw')}
                                className={`p-2 rounded ${activeTool === 'draw' ? 'bg-blue-600 text-white shadow' : 'hover:bg-gray-300'}`}
                                title="Draw Box"
                            ><Square className="w-4 h-4" /></button>
                            <button
                                onClick={() => setActiveTool('slice')}
                                className={`p-2 rounded ${activeTool === 'slice' ? 'bg-red-600 text-white shadow' : 'hover:bg-gray-300'}`}
                                title="Slice"
                            ><Scissors className="w-4 h-4" /></button>
                        </div>

                        <span className="text-sm text-gray-500 ml-2">{currentSources.length} sources</span>

                        <button
                            onClick={() => file && processFile(file)}
                            className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded text-sm flex items-center gap-1"
                        ><RotateCcw className="w-3 h-3" /> Re-analyze</button>

                        <button
                            onClick={() => setSources(sources.filter(s => s.pageIndex !== currentPage))}
                            className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded text-sm flex items-center gap-1"
                        >Clear Page</button>

                        <button className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium flex items-center gap-1">
                            <Save className="w-3 h-3" /> Save ({sources.length})
                        </button>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex">
                {/* Canvas */}
                <div className="flex-1 overflow-auto p-4">
                    {!file && (
                        <div
                            className="h-full flex items-center justify-center"
                            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setFile(f); processFile(f); } }}
                            onDragOver={e => e.preventDefault()}
                        >
                            <div
                                onClick={() => document.getElementById('uploader')?.click()}
                                className="border-2 border-dashed border-gray-300 rounded-xl p-16 flex flex-col items-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all"
                            >
                                <Upload className="w-10 h-10 text-blue-600 mb-3" />
                                <h3 className="text-lg font-semibold">Upload Source Sheet</h3>
                                <p className="text-gray-400 text-sm mt-1">PDF or Image file</p>
                                <p className="text-gray-300 text-xs mt-3">Python service auto-detects sources</p>
                                <input id="uploader" type="file" className="hidden" accept=".pdf,image/*"
                                    onChange={e => {
                                        console.log('File selected:', e.target.files?.[0]?.name);
                                        const f = e.target.files?.[0];
                                        if (f) {
                                            console.log('Processing file:', f.name, f.type);
                                            setFile(f);
                                            processFile(f);
                                        }
                                    }} />
                            </div>
                        </div>
                    )}

                    {isProcessing && (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
                                <p className="text-gray-600 font-medium">Analyzing with OpenCV...</p>
                                <div className="mt-4 text-left bg-gray-900 text-green-400 text-xs p-3 rounded max-w-md font-mono max-h-40 overflow-auto">
                                    {analysisLog.map((log, i) => <div key={i}>{log}</div>)}
                                </div>
                            </div>
                        </div>
                    )}

                    {!isProcessing && pageImages.length > 0 && (
                        <div
                            className={`relative inline-block max-w-full ${activeTool === 'draw' ? 'cursor-crosshair' :
                                activeTool === 'slice' ? 'cursor-row-resize' : 'cursor-default'
                                }`}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onClick={activeTool === 'slice' ? handleSliceClick : undefined}
                        >
                            <img
                                src={pageImages[currentPage]}
                                className="max-h-[calc(100vh-120px)] w-auto shadow-lg rounded select-none pointer-events-none"
                                draggable={false}
                            />

                            {currentSources.map((source, idx) => (
                                <div
                                    key={source.id}
                                    className={`absolute border-2 ${selectedSource === source.id
                                        ? 'border-green-500 bg-green-500/10'
                                        : 'border-blue-500 bg-blue-500/5 hover:bg-blue-500/10'
                                        } transition-colors group`}
                                    style={{
                                        left: `${source.x}%`,
                                        top: `${source.y}%`,
                                        width: `${source.width}%`,
                                        height: `${source.height}%`,
                                    }}
                                    onClick={(e) => {
                                        if (activeTool === 'select') {
                                            e.stopPropagation()
                                            setSelectedSource(source.id)
                                        }
                                    }}
                                >
                                    <span className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                                        {idx + 1}
                                    </span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteSource(source.id); }}
                                        className="absolute top-1 right-1 bg-red-600 text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}

                            {isDrawing && drawStart && drawCurrent && (
                                <div
                                    className="absolute border-2 border-blue-600 bg-blue-500/20 pointer-events-none"
                                    style={{
                                        left: `${Math.min(drawStart.x, drawCurrent.x)}%`,
                                        top: `${Math.min(drawStart.y, drawCurrent.y)}%`,
                                        width: `${Math.abs(drawCurrent.x - drawStart.x)}%`,
                                        height: `${Math.abs(drawCurrent.y - drawStart.y)}%`,
                                    }}
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                {pageImages.length > 0 && (
                    <div className="w-72 bg-white border-l overflow-auto flex flex-col">
                        {/* Sources List */}
                        <div className="flex-1 overflow-auto">
                            <div className="p-3 border-b bg-gray-50 sticky top-0">
                                <h3 className="font-semibold text-sm text-gray-700">Sources ({currentSources.length})</h3>
                            </div>
                            {currentSources.length === 0 ? (
                                <div className="p-4 text-center text-gray-400 text-sm">
                                    <Square className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                    Draw boxes around sources
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {currentSources.map((source, idx) => (
                                        <div
                                            key={source.id}
                                            className={`p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${selectedSource === source.id ? 'bg-blue-50' : ''
                                                }`}
                                            onClick={() => setSelectedSource(source.id)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="bg-blue-600 text-white text-xs w-5 h-5 rounded flex items-center justify-center font-bold">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-sm text-gray-600">
                                                    {Math.round(source.width)}% × {Math.round(source.height)}%
                                                </span>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteSource(source.id); }}
                                                className="text-gray-400 hover:text-red-600"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Analysis Log */}
                        <div className="border-t">
                            <div className="p-2 bg-gray-900 text-green-400 text-[10px] font-mono max-h-32 overflow-auto">
                                {analysisLog.length === 0 ? (
                                    <span className="text-gray-500">Analysis log will appear here</span>
                                ) : (
                                    analysisLog.map((log, i) => <div key={i}>{log}</div>)
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Instructions overlay */}
            {pageImages.length > 0 && currentSources.length === 0 && !isProcessing && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-full text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Auto-detection found nothing. Draw boxes manually.
                </div>
            )}
        </div>
    )
}
