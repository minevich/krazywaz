'use client'

import { ExternalLink } from 'lucide-react'
import { useMemo, useState } from 'react'

interface SourceSheetViewerProps {
  sourceDoc: string
  title: string
}

interface SourceData {
  id: string
  name: string
  image: string | null
  rotation: number
  reference: string | null
  displaySize?: number
}

// Convert Google Drive/Docs URL to embeddable format
function convertToEmbedUrl(url: string): string {
  if (!url) return url

  if (url.includes('/preview') || url.includes('embedded=true')) {
    return url
  }

  const driveMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1]
    if (url.includes('docs.google.com/document')) {
      return `https://docs.google.com/document/d/${fileId}/pub?embedded=true`
    }
    return `https://drive.google.com/file/d/${fileId}/preview`
  }

  return url
}

function CollapsibleSource({ source, index }: { source: SourceData; index: number }) {
  const [isOpen, setIsOpen] = useState(false) // Collapsed by default

  return (
    <article
      className={`group bg-white rounded-xl border transition-all duration-200 overflow-hidden ${isOpen ? 'border-slate-300 shadow-sm' : 'border-slate-200 hover:border-slate-300'
        }`}
    >
      {/* Source Header - Clickable to toggle */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none bg-white hover:bg-slate-50 transition-colors"
      >
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${isOpen ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white'
          }`}>
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold truncate text-[15px] transition-colors ${isOpen ? 'text-slate-900' : 'text-slate-700'}`}>
            {source.name}
          </h3>
          {source.reference && (
            <p className="text-xs text-slate-400 mt-0.5">
              {source.reference}
            </p>
          )}
        </div>

        <div className={`transform transition-transform duration-200 text-slate-400 ${isOpen ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Source Image - Collapsible content */}
      <div
        className={`bg-slate-50/50 border-t border-slate-100 transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
          }`}
      >
        {source.image && (
          <div className="p-6 md:p-8 flex justify-center">
            <div
              className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden"
              style={{ width: `${source.displaySize || 75}%`, transition: 'width 0.3s' }}
            >
              <img
                src={source.image}
                alt={source.name}
                className="w-full block"
                style={{
                  transform: source.rotation ? `rotate(${source.rotation}deg)` : undefined,
                  transformOrigin: 'center'
                }}
              />
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

export default function SourceSheetViewer({ sourceDoc, title }: SourceSheetViewerProps) {
  const isSourcesJson = sourceDoc?.startsWith('sources:')
  const parsedData = useMemo(() => {
    if (!isSourcesJson) return { sources: [], originalUrl: null }
    try {
      const json = JSON.parse(sourceDoc.slice(8))
      if (Array.isArray(json)) {
        return { sources: json as SourceData[], originalUrl: null }
      } else {
        return { sources: json.sources as SourceData[], originalUrl: json.originalUrl || null }
      }
    } catch {
      return { sources: [], originalUrl: null }
    }
  }, [sourceDoc, isSourcesJson])

  const { sources, originalUrl } = parsedData
  const [showOriginal, setShowOriginal] = useState(false)

  // Use legacy URL if not JSON, or if we have an originalUrl available for viewing
  const pdfUrl = useMemo(() => {
    if (isSourcesJson) return originalUrl ? convertToEmbedUrl(originalUrl) : null
    return convertToEmbedUrl(sourceDoc)
  }, [sourceDoc, isSourcesJson, originalUrl])


  if (!sourceDoc) return null

  const hasBothOptions = isSourcesJson && sources.length > 0 && originalUrl

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📜</span>
          <div>
            <h2 className="font-bold text-slate-800 text-lg leading-tight">Source Sheet</h2>
            <p className="text-xs text-slate-400">{hasBothOptions ? (showOriginal ? 'PDF View' : 'Clipped View') : 'Viewer'}</p>
          </div>
        </div>

        {/* Toggle Switch */}
        {hasBothOptions && (
          <div className="bg-slate-100 p-1 rounded-lg flex items-center">
            <button
              onClick={() => setShowOriginal(false)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${!showOriginal ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Clipped
            </button>
            <button
              onClick={() => setShowOriginal(true)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${showOriginal ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              PDF
            </button>
          </div>
        )}

        {!hasBothOptions && pdfUrl && (
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            Open New Tab <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Content Area */}
      <div className="bg-slate-50/50 p-0">
        {/* PDF VIEW */}
        {(showOriginal || (!isSourcesJson && pdfUrl)) && pdfUrl ? (
          <div className="w-full h-[80vh] min-h-[500px] bg-slate-100">
            <iframe
              src={pdfUrl}
              className="w-full h-full"
              title="Source PDF"
            />
          </div>
        ) : (
          /* CLIPPED VIEW */
          <div className="p-4 md:p-6 lg:p-8 space-y-4 min-h-[400px]">
            {sources.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                No sources available to display.
              </div>
            ) : (
              sources.map((source, idx) => (
                <CollapsibleSource key={source.id} source={source} index={idx} />
              ))
            )}

            <div className="text-center pt-8 pb-4">
              <p className="text-xs text-slate-300 uppercase tracking-widest">End of Sources</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
