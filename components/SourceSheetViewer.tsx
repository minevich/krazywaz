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

  // If it's already a preview URL, return as is
  if (url.includes('/preview') || url.includes('embedded=true')) {
    return url
  }

  // Handle Google Drive files (PDFs, etc.)
  // Extract file ID from Google Drive URL
  const driveMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1]

    // Check if it's a Google Doc
    if (url.includes('docs.google.com/document')) {
      // Convert to published format
      return `https://docs.google.com/document/d/${fileId}/pub?embedded=true`
    }

    // For Google Drive files (PDFs, etc.), use the preview format
    // This works if the file is shared with "Anyone with the link"
    return `https://drive.google.com/file/d/${fileId}/preview`
  }

  // For other URLs (direct PDF links, HTML pages, etc.), return as is
  return url
}

export default function SourceSheetViewer({ sourceDoc, title }: SourceSheetViewerProps) {
  // Check if this is the new JSON format
  const isSourcesJson = sourceDoc?.startsWith('sources:')

  const sources: SourceData[] = useMemo(() => {
    if (!isSourcesJson) return []
    try {
      return JSON.parse(sourceDoc.slice(8)) // Remove 'sources:' prefix
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
  // NEW: Render HTML sources from clipped images
  // ============================================================================
  if (isSourcesJson && sources.length > 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 md:p-6 lg:p-10">
          <h2 className="font-serif text-xl md:text-2xl font-semibold text-primary mb-6">
            Source Sheet
          </h2>

          <div className="space-y-6">
            {sources.map((source, idx) => (
              <div key={source.id} className="border rounded-lg overflow-hidden shadow-sm">
                {/* Source header */}
                <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-4 py-3 flex items-center gap-3 border-b">
                  <span className="w-8 h-8 bg-blue-600 text-white text-sm font-bold rounded-full flex items-center justify-center shadow">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-slate-800">{source.name}</span>
                  {source.reference && (
                    <span className="ml-auto text-sm text-blue-600 font-medium">
                      {source.reference}
                    </span>
                  )}
                </div>

                {/* Source image */}
                {source.image && (
                  <div className="bg-white">
                    <img
                      src={source.image}
                      alt={source.name}
                      className="w-full"
                      style={{
                        transform: source.rotation ? `rotate(${source.rotation}deg)` : undefined
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
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

        {/* Embedded Source Sheet - Full Width, Responsive Height */}
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
