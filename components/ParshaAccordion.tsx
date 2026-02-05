'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, BookOpen, Loader2, Youtube, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ParshaVideo {
    id: string
    title: string
    thumbnail: string | null
    duration: string | null
    position: number | null
    shiurId: string | null
    slug: string | null
}

interface ParshaData {
    parsha: string
    parshaHebrew: string
    shabbosDate: string
}

interface ParshaVideosResponse {
    parsha: string
    playlistId: string | null
    playlistTitle: string | null
    playlistUrl: string | null
    videos: ParshaVideo[]
}

export default function ParshaAccordion() {
    const [isOpen, setIsOpen] = useState(false)
    const [parshaData, setParshaData] = useState<ParshaData | null>(null)
    const [videosData, setVideosData] = useState<ParshaVideosResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadingVideos, setLoadingVideos] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchData() {
            try {
                const parshaRes = await fetch('/api/parsha')

                if (!parshaRes.ok) {
                    throw new Error('Failed to fetch parsha')
                }
                const parshaJson = await parshaRes.json() as ParshaData
                setParshaData(parshaJson)
            } catch (err: any) {
                console.error('Error loading parsha data:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    // Load videos when accordion opens
    useEffect(() => {
        if (isOpen && parshaData && !videosData && !loadingVideos) {
            setLoadingVideos(true)
            fetch(`/api/parsha/videos?parsha=${encodeURIComponent(parshaData.parsha)}`)
                .then(res => res.json() as Promise<ParshaVideosResponse>)
                .then((data) => {
                    setVideosData(data)
                })
                .catch(err => {
                    console.error('Error loading parsha videos:', err)
                })
                .finally(() => {
                    setLoadingVideos(false)
                })
        }
    }, [isOpen, parshaData, videosData, loadingVideos])

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-muted-foreground">Loading this week's parsha...</span>
                </div>
            </div>
        )
    }

    if (error || !parshaData) {
        return null // Silently fail - don't break the page
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Accordion Header */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between p-4 md:p-5 text-left transition-colors hover:bg-gray-50 group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-serif font-semibold text-primary">
                                This Week's Parsha
                                <span className="font-normal text-muted-foreground ml-2">
                                    ({parshaData.parsha})
                                </span>
                            </h2>
                            {parshaData.parshaHebrew && (
                                <p className="text-sm text-muted-foreground">{parshaData.parshaHebrew}</p>
                            )}
                        </div>
                    </div>
                    <ChevronDown
                        className={cn(
                            "w-5 h-5 text-muted-foreground transition-transform duration-300",
                            isOpen && "rotate-180"
                        )}
                    />
                </button>

                {/* Accordion Content */}
                <div
                    className={cn(
                        "transition-all duration-300 ease-in-out overflow-hidden border-t border-gray-100",
                        isOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0 border-t-0"
                    )}
                >
                    <div className="p-4 md:p-5">
                        {loadingVideos ? (
                            <div className="flex items-center justify-center py-8 gap-3">
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                <span className="text-muted-foreground">Loading shiurim...</span>
                            </div>
                        ) : videosData && videosData.videos.length > 0 ? (
                            <div className="space-y-3">
                                {/* Video List */}
                                {videosData.videos.slice(0, 6).map((video) => (
                                    <div
                                        key={video.id}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <img
                                            src={video.thumbnail || '/placeholder-thumb.jpg'}
                                            alt={video.title}
                                            className="w-20 h-12 object-cover rounded flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            {video.slug ? (
                                                <Link
                                                    href={`/${video.slug}`}
                                                    className="text-sm font-medium text-gray-800 hover:text-primary transition-colors line-clamp-2"
                                                >
                                                    {video.title}
                                                </Link>
                                            ) : (
                                                <a
                                                    href={`https://www.youtube.com/watch?v=${video.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm font-medium text-gray-800 hover:text-primary transition-colors line-clamp-2"
                                                >
                                                    {video.title}
                                                </a>
                                            )}
                                            {video.duration && (
                                                <p className="text-xs text-muted-foreground mt-0.5">{video.duration}</p>
                                            )}
                                        </div>
                                        {video.slug ? (
                                            <Link
                                                href={`/${video.slug}`}
                                                className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex-shrink-0"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </Link>
                                        ) : (
                                            <a
                                                href={`https://www.youtube.com/watch?v=${video.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all flex-shrink-0"
                                            >
                                                <Youtube className="w-4 h-4" />
                                            </a>
                                        )}
                                    </div>
                                ))}

                                {/* View All Link */}
                                {videosData.playlistUrl && videosData.videos.length > 6 && (
                                    <a
                                        href={videosData.playlistUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition-all font-medium text-sm"
                                    >
                                        <Youtube className="w-4 h-4" />
                                        View all {videosData.videos.length} shiurim on YouTube
                                    </a>
                                )}
                            </div>
                        ) : videosData?.playlistUrl ? (
                            // Fallback: Link to YouTube if we have playlist but no cached videos
                            <a
                                href={videosData.playlistUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100 group"
                            >
                                <div className="flex-1">
                                    <h3 className="font-serif font-semibold text-primary group-hover:text-secondary transition-colors">
                                        {videosData.playlistTitle || parshaData.parsha}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Watch on YouTube
                                    </p>
                                </div>
                                <div className="p-3 bg-red-50 text-red-500 rounded-full group-hover:bg-red-500 group-hover:text-white transition-all transform group-hover:scale-110">
                                    <Youtube className="w-5 h-5" />
                                </div>
                            </a>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-lg text-muted-foreground mb-2">
                                    We're sorry, we don't have any shiurim on this week's parsha yet.
                                </p>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Check back soon or explore our other Torah content!
                                </p>
                                <a
                                    href="/playlists"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary/10 text-primary rounded-full font-medium hover:bg-primary/20 transition-colors"
                                >
                                    Browse All Playlists →
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
