'use client'

import { useState, useEffect } from 'react'
import { Eye } from 'lucide-react'

interface ViewCounterProps {
    shiurId: string
    showBreakdown?: boolean
}

interface Analytics {
    websiteViews: number
    youtubeViews: number
    spotifyPlays: number
    applePlays: number
    amazonPlays: number
    otherPlays: number
    totalViews: number
}

export default function ViewCounter({ shiurId, showBreakdown = true }: ViewCounterProps) {
    const [analytics, setAnalytics] = useState<Analytics | null>(null)
    const [loading, setLoading] = useState(true)
    const [showDetails, setShowDetails] = useState(false)

    useEffect(() => {
        // Fetch analytics (no longer tracking here - tracking happens on audio play)
        fetch(`/api/analytics/${shiurId}`)
            .then(res => res.json() as Promise<Analytics>)
            .then((data: Analytics) => {
                setAnalytics(data)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [shiurId])

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
        return num.toString()
    }

    if (loading) {
        return (
            <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                <Eye className="w-4 h-4" />
                <span className="animate-pulse">—</span>
            </div>
        )
    }

    if (!analytics) {
        return null // Only hide if fetch failed
    }

    return (
        <div
            className="relative inline-flex items-center gap-1.5 text-gray-500 text-sm cursor-pointer"
            onMouseEnter={() => showBreakdown && setShowDetails(true)}
            onMouseLeave={() => setShowDetails(false)}
        >
            <Eye className="w-4 h-4" />
            <span>{formatNumber(analytics.totalViews)} views</span>

            {/* Breakdown Tooltip */}
            {showBreakdown && showDetails && (
                <div className="absolute bottom-full left-0 mb-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 min-w-[140px] z-50">
                    <div className="space-y-1">
                        {analytics.websiteViews > 0 && (
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-400">Website</span>
                                <span>{formatNumber(analytics.websiteViews)}</span>
                            </div>
                        )}
                        {analytics.youtubeViews > 0 && (
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-400">YouTube</span>
                                <span>{formatNumber(analytics.youtubeViews)}</span>
                            </div>
                        )}
                        {analytics.spotifyPlays > 0 && (
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-400">Spotify</span>
                                <span>{formatNumber(analytics.spotifyPlays)}</span>
                            </div>
                        )}
                        {analytics.applePlays > 0 && (
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-400">Apple</span>
                                <span>{formatNumber(analytics.applePlays)}</span>
                            </div>
                        )}
                        {analytics.amazonPlays > 0 && (
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-400">Amazon</span>
                                <span>{formatNumber(analytics.amazonPlays)}</span>
                            </div>
                        )}
                        {analytics.otherPlays > 0 && (
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-400">Other</span>
                                <span>{formatNumber(analytics.otherPlays)}</span>
                            </div>
                        )}
                    </div>
                    {/* Arrow */}
                    <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
            )}
        </div>
    )
}
