'use client'

import { useState, useCallback } from 'react'
import { Upload, Loader2, RefreshCw, X, Save, Trash2, ScanLine, Grid3X3, Grid2X2 } from 'lucide-react'
import ReactCrop, { PercentCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

interface Source {
    id: string
    title: string
    pageIndex: number
    crop: PercentCrop
}

export default function SourceManager() {
    const [file, setFile] = useState<File | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [sources, setSources] = useState<Source[]>([])
    const [pageImages, setPageImages] = useState<string[]>([])

    // Quick Slice State
    const [sliceModePageId, setSliceModePageId] = useState<number | null>(null)
    const [hoverLineY, setHoverLineY] = useState<number | null>(null)

    const [editingSourceId, setEditingSourceId] = useState<string | null>(null)

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        const f = e.dataTransfer.files[0]
        if (f) {
            setFile(f)
            processFile(f)
        }
    }, [])

    const processFile = async (f: File) => {
        setIsProcessing(true)
        setSources([])
        setPageImages([])
        setSliceModePageId(null)

        try {
            let images: File[] = []
            if (f.type === 'application/pdf') {
                images = await pdfToImages(f)
            } else {
                images = [f]
            }

            const newPageImages: string[] = []
            const newSources: Source[] = []

            for (let i = 0; i < images.length; i++) {
                const imageUrl = await fileToBase64(images[i])
                newPageImages.push(imageUrl)

                // Call API to find gaps and create regions
                const formData = new FormData()
                formData.append('file', images[i])

                try {
                    const res = await fetch('/api/sources/parse', { method: 'POST', body: formData })
                    const data = await res.json() as { success: boolean; regions: any[] }

                    if (data.success && data.regions) {
                        data.regions.forEach((r: any) => {
                            const [ymin, xmin, ymax, xmax] = r.box_2d || [0, 0, 1000, 1000]
                            newSources.push({
                                id: crypto.randomUUID(),
                                title: r.title || `Source ${newSources.length + 1}`,
                                pageIndex: i,
                                crop: {
                                    unit: '%',
                                    x: xmin / 10,
                                    y: ymin / 10,
                                    width: (xmax - xmin) / 10,
                                    height: (ymax - ymin) / 10
                                }
                            })
                        })
                    }
                } catch (e) {
                    // Fallback to full page
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
            alert('Error processing file: ' + e)
        } finally {
            setIsProcessing(false)
        }
    }

    // Quick Grid Split - divide a page into N equal parts
    const splitPageIntoGrid = (pageIndex: number, rows: number, cols: number) => {
        // Remove existing sources for this page
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
                    crop: {
                        unit: '%',
                        x: c * cellWidth,
                        y: r * cellHeight,
                        width: cellWidth,
                        height: cellHeight
                    }
                })
                num++
            }
        }

        setSources([...otherSources, ...newSources])
    }

    const onUpdateCrop = (id: string, c: PercentCrop) => {
        setSources(sources.map(s => s.id === id ? { ...s, crop: c } : s))
    }

    // Slice Logic
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
                title: `Source ${sources.filter(s => s.pageIndex === pageIndex).length}`
            }

            const newBottom: Source = {
                id: crypto.randomUUID(),
                title: `Source ${sources.filter(s => s.pageIndex === pageIndex).length + 1}`,
                pageIndex: pageIndex,
                crop: {
                    ...targetSource.crop,
                    y: targetSource.crop.y + splitRelativeY,
                    height: oldHeight - splitRelativeY
                }
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

    // Helpers
    const pdfToImages = async (pdfFile: File): Promise<File[]> => {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        const pdf = await pdfjsLib.getDocument({ data: await pdfFile.arrayBuffer() }).promise
        const files: File[] = []
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const viewport = page.getViewport({ scale: 2 })
            const canvas = document.createElement('canvas')
            canvas.width = viewport.width
            canvas.height = viewport.height
            await page.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas } as any).promise
            const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'))
            if (blob) files.push(new File([blob], `page-${i}.png`, { type: 'image/png' }))
        }
        return files
    }

    const fileToBase64 = (f: File) => new Promise<string>(r => {
        const reader = new FileReader(); reader.onload = () => r(reader.result as string); reader.readAsDataURL(f)
    })

    return (
        <div className="max-w-4xl mx-auto p-6 font-sans text-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Source Extraction</h1>
                    <p className="text-gray-500 text-xs mt-1">Click to slice • Grid buttons for quick split</p>
                </div>

                {file && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setFile(null); setSources([]); setPageImages([]); }}
                            className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded text-xs font-medium"
                        >
                            Reset
                        </button>
                    </div>
                )}
            </div>

            {/* Empty State */}
            {!file && (
                <div
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => document.getElementById('uploader')?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all group"
                >
                    <div className="bg-blue-50 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">Upload Source Sheet</h3>
                    <p className="text-gray-400 text-xs mt-1">PDFs or Images • You'll slice it manually</p>
                    <input
                        id="uploader"
                        type="file"
                        className="hidden"
                        accept=".pdf,image/*"
                        onChange={e => {
                            const f = e.target.files?.[0]
                            if (f) {
                                setFile(f)
                                processFile(f)
                            }
                        }}
                    />
                </div>
            )}

            {/* Processing */}
            {isProcessing && (
                <div className="text-center py-12 animate-pulse">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 font-medium text-xs">Loading pages...</p>
                </div>
            )}

            {/* Results */}
            {!isProcessing && pageImages.length > 0 && (
                <div className="space-y-8 relative z-0">
                    {pageImages.map((img, pageIdx) => (
                        <div key={pageIdx} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">
                            {/* Toolbar */}
                            <div className="bg-gray-50 px-3 py-2 border-b flex justify-between items-center sticky top-0 z-20">
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold text-gray-700 text-xs">Page {pageIdx + 1}</span>
                                    <span className="text-[10px] text-gray-400">{sources.filter(s => s.pageIndex === pageIdx).length} sources</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Quick Grid Buttons */}
                                    <div className="flex gap-1 mr-2">
                                        <button
                                            onClick={() => splitPageIntoGrid(pageIdx, 2, 1)}
                                            className="px-2 py-1 text-[10px] bg-gray-200 hover:bg-gray-300 rounded font-medium"
                                            title="Split into 2 rows"
                                        >
                                            2
                                        </button>
                                        <button
                                            onClick={() => splitPageIntoGrid(pageIdx, 3, 1)}
                                            className="px-2 py-1 text-[10px] bg-gray-200 hover:bg-gray-300 rounded font-medium"
                                            title="Split into 3 rows"
                                        >
                                            3
                                        </button>
                                        <button
                                            onClick={() => splitPageIntoGrid(pageIdx, 4, 1)}
                                            className="px-2 py-1 text-[10px] bg-gray-200 hover:bg-gray-300 rounded font-medium"
                                            title="Split into 4 rows"
                                        >
                                            4
                                        </button>
                                        <button
                                            onClick={() => splitPageIntoGrid(pageIdx, 3, 2)}
                                            className="px-2 py-1 text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-700 rounded font-medium flex items-center gap-1"
                                            title="Split into 3x2 grid (6)"
                                        >
                                            <Grid2X2 className="w-3 h-3" /> 6
                                        </button>
                                        <button
                                            onClick={() => splitPageIntoGrid(pageIdx, 3, 3)}
                                            className="px-2 py-1 text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-700 rounded font-medium flex items-center gap-1"
                                            title="Split into 3x3 grid (9)"
                                        >
                                            <Grid3X3 className="w-3 h-3" /> 9
                                        </button>
                                    </div>

                                    {/* Slice Mode Toggle */}
                                    <button
                                        onClick={() => setSliceModePageId(sliceModePageId === pageIdx ? null : pageIdx)}
                                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full transition-all ${sliceModePageId === pageIdx ? 'bg-red-600 text-white shadow-inner' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                    >
                                        <ScanLine className="w-3 h-3" /> {sliceModePageId === pageIdx ? 'Done' : 'Slice'}
                                    </button>
                                </div>
                            </div>

                            <div
                                className={`relative select-none ${sliceModePageId === pageIdx ? 'cursor-crosshair' : ''}`}
                                onMouseMove={(e) => {
                                    if (sliceModePageId === pageIdx) {
                                        const rect = e.currentTarget.getBoundingClientRect()
                                        setHoverLineY(e.clientY - rect.top)
                                    }
                                }}
                                onMouseLeave={() => setHoverLineY(null)}
                                onClick={(e) => sliceModePageId === pageIdx && handleSliceClick(e, pageIdx, e.currentTarget.querySelector('img')!)}
                            >
                                <img src={img} className="w-full block pointer-events-none" />

                                {/* Slice Line */}
                                {sliceModePageId === pageIdx && hoverLineY !== null && (
                                    <div
                                        className="absolute w-full h-0.5 bg-red-500 z-50 pointer-events-none shadow-lg"
                                        style={{ top: hoverLineY }}
                                    >
                                        <div className="absolute right-2 -top-6 bg-red-600 text-white text-[9px] px-2 py-0.5 rounded shadow-sm">Click to cut here</div>
                                    </div>
                                )}

                                {/* Source Overlays */}
                                {sources.filter(s => s.pageIndex === pageIdx).map((source, idx) => (
                                    <div
                                        key={source.id}
                                        className="absolute group z-10"
                                        style={{
                                            left: `${source.crop.x}%`,
                                            top: `${source.crop.y}%`,
                                            width: `${source.crop.width}%`,
                                            height: `${source.crop.height}%`,
                                        }}
                                    >
                                        <div
                                            className={`w-full h-full border-2 box-border transition-all ${sliceModePageId === pageIdx
                                                ? 'border-red-400 border-dashed bg-red-500/5'
                                                : 'border-blue-400 bg-blue-500/5 hover:bg-blue-500/10 cursor-pointer'
                                                }`}
                                            onClick={(e) => {
                                                if (sliceModePageId !== pageIdx) {
                                                    e.stopPropagation()
                                                    setEditingSourceId(source.id)
                                                }
                                            }}
                                        >
                                            <div className={`absolute top-1 left-1 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm font-bold ${sliceModePageId === pageIdx ? 'bg-red-600' : 'bg-blue-600'}`}>
                                                {idx + 1}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Save Button */}
                    <div className="flex justify-center pt-4 pb-12 sticky bottom-0 pointer-events-none">
                        <button className="pointer-events-auto px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-full shadow-lg hover:bg-blue-700 hover:scale-105 transition-all flex items-center gap-2">
                            <Save className="w-4 h-4" /> Save All ({sources.length} sources)
                        </button>
                    </div>

                    {/* Edit Modal */}
                    {editingSourceId && !sliceModePageId && (() => {
                        const source = sources.find(s => s.id === editingSourceId)
                        if (!source) return null
                        const img = pageImages[source.pageIndex]

                        return (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                                <div className="bg-white rounded-xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                                    <div className="p-3 border-b flex justify-between items-center bg-gray-50">
                                        <span className="font-bold text-sm">Adjust Source</span>
                                        <button onClick={() => setEditingSourceId(null)} className="p-1.5 hover:bg-gray-200 rounded-full"><X className="w-4 h-4" /></button>
                                    </div>

                                    <div className="flex-1 overflow-auto bg-gray-100 p-4 flex justify-center">
                                        <ReactCrop
                                            crop={source.crop}
                                            onChange={(_, p) => onUpdateCrop(source.id, p)}
                                            className="shadow-sm bg-white"
                                        >
                                            <img src={img} className="max-h-[60vh] object-contain block" />
                                        </ReactCrop>
                                    </div>

                                    <div className="p-3 border-t bg-gray-50 flex justify-between gap-3 text-xs">
                                        <button
                                            onClick={() => {
                                                setSources(sources.filter(s => s.id !== editingSourceId))
                                                setEditingSourceId(null)
                                            }}
                                            className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded font-medium flex items-center gap-1.5"
                                        >
                                            <Trash2 className="w-3 h-3" /> Delete
                                        </button>
                                        <button
                                            onClick={() => setEditingSourceId(null)}
                                            className="bg-blue-600 text-white px-6 py-1.5 rounded font-bold hover:bg-blue-700 shadow-sm"
                                        >
                                            Done
                                        </button>
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
