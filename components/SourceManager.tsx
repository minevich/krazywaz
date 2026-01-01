'use client'

import { useState, useCallback } from 'react'
import { Upload, Loader2, Trash2, Plus, Scissors, Layers, FileText, ChevronDown, ChevronUp } from 'lucide-react'

interface Source {
    id: string
    title: string
    pageIndex: number
    y: number       // % from top
    height: number  // % height
    imageUrl: string // The full page image this source belongs to
}

export default function SourceManager() {
    const [file, setFile] = useState<File | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [sources, setSources] = useState<Source[]>([])
    const [pageImages, setPageImages] = useState<string[]>([])
    const [activePage, setActivePage] = useState<number>(0)

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        const f = e.dataTransfer.files[0]
        if (f && (f.type === 'application/pdf' || f.type.startsWith('image/'))) {
            setFile(f)
            setSources([])
            setPageImages([])
            setActivePage(0)
        }
    }, [])

    const processFile = async () => {
        if (!file) return
        setIsProcessing(true)
        setSources([])
        setPageImages([])

        try {
            let images: File[] = []

            if (file.type === 'application/pdf') {
                images = await pdfToImages(file)
            } else {
                images = [file]
            }

            const newSources: Source[] = []
            const newPageImages: string[] = []

            // Process each page
            for (let i = 0; i < images.length; i++) {
                const imageFile = images[i]

                // Convert to base64 for preview
                const imageUrl = await fileToBase64(imageFile)
                newPageImages.push(imageUrl)

                // Send to API for region detection
                const formData = new FormData()
                formData.append('file', imageFile)

                try {
                    const res = await fetch('/api/sources/parse', { method: 'POST', body: formData })
                    const data = await res.json() as { success: boolean; regions: any[]; error?: string }

                    if (data.success && data.regions) {
                        data.regions.forEach((r: any, idx: number) => {
                            newSources.push({
                                id: crypto.randomUUID(),
                                title: r.title || `Page ${i + 1} - Source ${idx + 1}`,
                                pageIndex: i,
                                y: r.y ?? 0,
                                height: r.height ?? 20,
                                imageUrl: imageUrl
                            })
                        })
                    } else {
                        // Fallback source if AI fails for this page
                        newSources.push({
                            id: crypto.randomUUID(),
                            title: `Page ${i + 1} - Full Page`,
                            pageIndex: i,
                            y: 0,
                            height: 100,
                            imageUrl: imageUrl
                        })
                    }
                } catch (e) {
                    console.error(`Error processing page ${i + 1}`, e)
                }
            }

            setPageImages(newPageImages)
            setSources(newSources)

        } catch (e) {
            console.error(e)
            alert('Error processing file')
        } finally {
            setIsProcessing(false)
        }
    }

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = error => reject(error)
        })
    }

    const pdfToImages = async (pdfFile: File): Promise<File[]> => {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

        const buffer = await pdfFile.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
        const images: File[] = []

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const scale = 2
            const viewport = page.getViewport({ scale })
            const canvas = document.createElement('canvas')
            canvas.width = viewport.width
            canvas.height = viewport.height

            await page.render({
                canvasContext: canvas.getContext('2d')!,
                viewport,
                canvas
            } as any).promise

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
            if (blob) {
                images.push(new File([blob], `page-${i}.png`, { type: 'image/png' }))
            }
        }
        return images
    }

    const deleteSource = (id: string) => setSources(sources.filter(s => s.id !== id))

    const splitSource = (id: string) => {
        const idx = sources.findIndex(s => s.id === id)
        if (idx === -1) return

        const source = sources[idx]
        const half = source.height / 2

        const newSources = [...sources]
        newSources[idx] = { ...source, height: half }
        newSources.splice(idx + 1, 0, {
            id: crypto.randomUUID(),
            title: `${source.title} (Part 2)`,
            pageIndex: source.pageIndex,
            y: source.y + half,
            height: half,
            imageUrl: source.imageUrl
        })
        setSources(newSources)
    }

    const updateSource = (id: string, field: 'y' | 'height' | 'title', value: number | string) => {
        setSources(sources.map(s => s.id === id ? { ...s, [field]: value } : s))
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8 font-sans text-gray-800">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Source Manager</h1>
                    <p className="text-gray-500 mt-1">AI-powered extraction for multi-page source sheets</p>
                </div>
            </div>

            {/* Upload Area - Only show if no sources yet */}
            {sources.length === 0 && !isProcessing && (
                <div
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    className="border-3 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group"
                    onClick={() => document.getElementById('file-input')?.click()}
                >
                    <div className="bg-white  w-20 h-20 mx-auto rounded-full shadow-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <Upload className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Upload Source Sheet</h3>
                    <p className="text-gray-500 mb-6">Drag & drop PDF or images here</p>
                    <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]) }}
                        className="hidden"
                        id="file-input"
                    />
                    {file && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-medium">
                            <FileText className="w-4 h-4" />
                            {file.name}
                        </div>
                    )}
                </div>
            )}

            {/* Processing State */}
            {isProcessing && (
                <div className="text-center py-20">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-800">Analyzing Sacred Texts...</h3>
                    <p className="text-gray-500">Gemini AI is identifying source boundaries across all pages.</p>
                </div>
            )}

            {/* Action Bar */}
            {file && !isProcessing && sources.length === 0 && (
                <button
                    onClick={processFile}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all"
                >
                    ✨ Extract Sources with AI
                </button>
            )}

            {/* Results Interface */}
            {sources.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Panel: Preview & Page Navigation */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="sticky top-6">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
                                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    <Layers className="w-4 h-4" /> pages
                                </h3>
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {pageImages.map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActivePage(idx)}
                                            className={`relative w-16 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${activePage === idx ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 opacity-60 hover:opacity-100'}`}
                                        >
                                            <img src={img} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white text-xs font-bold">
                                                {idx + 1}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-gray-100 rounded-xl overflow-hidden border shadow-inner relative">
                                <img src={pageImages[activePage]} alt="Current Page" className="w-full" />
                                {/* Overlay for Current Page Sources */}
                                <div className="absolute inset-0 pointer-events-none">
                                    {sources.filter(s => s.pageIndex === activePage).map((s, i) => (
                                        <div
                                            key={s.id}
                                            className="absolute left-0 right-0 border-2 border-blue-500 bg-blue-500/10 group"
                                            style={{ top: `${s.y}%`, height: `${s.height}%` }}
                                        >
                                            <span className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity">
                                                {s.title}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => { setSources([]); setPageImages([]); setFile(null); }}
                                className="w-full mt-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
                            >
                                Start Over
                            </button>
                        </div>
                    </div>

                    {/* Right Panel: Source Cards */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-800">Extracted Sources ({sources.length})</h2>
                            <button
                                onClick={() => {
                                    setSources([...sources, {
                                        id: crypto.randomUUID(),
                                        title: 'New Source',
                                        pageIndex: activePage,
                                        y: 0,
                                        height: 20,
                                        imageUrl: pageImages[activePage]
                                    }])
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4" /> Add Manual Source
                            </button>
                        </div>

                        <div className="space-y-4">
                            {sources.map((source, i) => (
                                <div key={source.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden group">

                                    {/* Card Header */}
                                    <div className="flex items-center gap-4 p-4 border-b border-gray-100 bg-gray-50/50">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                                            {i + 1}
                                        </div>
                                        <input
                                            type="text"
                                            value={source.title}
                                            onChange={e => updateSource(source.id, 'title', e.target.value)}
                                            className="flex-1 bg-transparent font-semibold text-gray-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 rounded px-2 py-1 transition-all"
                                            placeholder="Enter Title..."
                                        />
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => splitSource(source.id)}
                                                className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg tooltip"
                                                title="Split Source"
                                            >
                                                <Scissors className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteSource(source.id)}
                                                className="p-2 hover:bg-red-100 text-red-500 rounded-lg"
                                                title="Delete Source"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Crop Preview */}
                                        <div className="relative h-48 bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                                            <div className="w-full h-full relative overflow-hidden">
                                                <img
                                                    src={source.imageUrl}
                                                    className="absolute w-full max-w-none origin-top-left"
                                                    style={{
                                                        height: `${(100 / source.height) * 100}%`,
                                                        top: `-${(source.y / source.height) * 100}%`
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Controls */}
                                        <div className="space-y-6 py-2">
                                            <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 font-medium">
                                                Page {source.pageIndex + 1}
                                            </div>

                                            <div className="space-y-4">
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs font-medium text-gray-500">
                                                        <span>Vertical Position</span>
                                                        <span>{source.y}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="0" max="99"
                                                        value={source.y}
                                                        onChange={e => updateSource(source.id, 'y', Number(e.target.value))}
                                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs font-medium text-gray-500">
                                                        <span>Height / Thickness</span>
                                                        <span>{source.height}%</span>
                                                    </div>
                                                    <input
                                                        type="range" min="1" max="100"
                                                        value={source.height}
                                                        onChange={e => updateSource(source.id, 'height', Number(e.target.value))}
                                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
