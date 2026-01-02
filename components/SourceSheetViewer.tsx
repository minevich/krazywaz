'use client'

import { ExternalLink } from 'lucide-react'
import { useMemo } from 'react'

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

export default function SourceSheetViewer({ sourceDoc, title }: SourceSheetViewerProps) {
  const isSourcesJson = sourceDoc?.startsWith('sources:')

  const sources: SourceData[] = useMemo(() => {
    if (!isSourcesJson) return []
    try {
      return JSON.parse(sourceDoc.slice(8))
    } catch {
      return []
    }
  }, [sourceDoc, isSourcesJson])

  const embedUrl = useMemo(() => {
    if (isSourcesJson) return null
    return convertToEmbedUrl(sourceDoc)
  }, [sourceDoc, isSourcesJson])

  if (!sourceDoc) return null

  // ============================================================================
  // NEW ELEGANT DESIGN: Render HTML sources from clipped images
  // ============================================================================
  if (isSourcesJson && sources.length > 0) {
    return (
      <div className="bg-gradient-to-b from-slate-50 to-white rounded-3xl shadow-lg border border-slate-200/60 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 py-5 md:px-8 md:py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                📜 Source Sheet
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                {sources.length} source{sources.length !== 1 ? 's' : ''} • {title}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <span className="text-white/80 text-sm">Scroll to explore</span>
              <span className="text-white animate-bounce">↓</span>
            </div>
          </div>
        </div>

        {/* Sources List */}
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
          {sources.map((source, idx) => (
            <article
              key={source.id}
              className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 overflow-hidden"
            >
              {/* Source Header */}
              <div className="flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-slate-50 to-transparent border-b border-slate-100">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 truncate text-lg">
                    {source.name}
                  </h3>
                  {source.reference && (
                    <p className="text-sm text-blue-600 font-medium mt-0.5">
                      {source.reference}
                    </p>
                  )}
                </div>
              </div>

              {/* Source Image */}
              {source.image && (
                <div className="relative bg-gradient-to-b from-slate-50 to-slate-100 p-4 md:p-6">
                  <div className="bg-white rounded-xl shadow-inner border border-slate-200/50 overflow-hidden">
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
            </article>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            Source sheet created with Rabbi Kraz's Source Clipper
          </p>
        </div>
      </div>
    )
  }

  // ============================================================================
  // LEGACY: Render embedded iframe for URL-based sources
  // ============================================================================
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 md:p-6 lg:p-10">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="font-serif text-xl md:text-2xl font-semibold text-primary">
            Source Sheet
          </h2>
          <a
            href={sourceDoc}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-2 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Open in new tab</span>
            <span className="sm:hidden">Open</span>
          </a>
        </div>

        <div
          className="w-full border border-gray-200 rounded-lg overflow-hidden bg-gray-50"
          style={{
            minHeight: '600px',
            height: 'calc(100vh - 300px)',
            maxHeight: '1200px'
          }}
        >
          <iframe
            src={embedUrl ?? ''}
            className="w-full h-full border-0"
            title={`Source Sheet: ${title}`}
            allowFullScreen
            loading="lazy"
            style={{
              minHeight: '600px',
              display: 'block'
            }}
          />
        </div>
      </div>
    </div>
  )
}
