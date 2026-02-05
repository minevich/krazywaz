'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Calendar, Loader2, Play, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Playlist {
    id: string
    title: string
    videoCount: number
    thumbnail: string
}

interface Video {
    id: string
    title: string
    thumbnail: string
    duration: string
    position: number
    shiurId: string | null
    slug?: string // added if joined with shiurim
}

export default function HolidaySelector() {
    const [holidays, setHolidays] = useState<Playlist[]>([])
    const [selectedHolidayId, setSelectedHolidayId] = useState<string>('')
    const [videos, setVideos] = useState<Video[]>([])
    const [loadingHolidays, setLoadingHolidays] = useState(true)
    const [loadingVideos, setLoadingVideos] = useState(false)

    useEffect(() => {
        async function fetchHolidays() {
            try {
                const res = await fetch('/api/holidays')
                const data = await res.json() as { playlists: Playlist[] }
                if (data.playlists) {
                    setHolidays(data.playlists)
                }
            } catch (error) {
                console.error('Failed to fetch holidays:', error)
            } finally {
                setLoadingHolidays(false)
            }
        }
        fetchHolidays()
    }, [])

    useEffect(() => {
        if (!selectedHolidayId) {
            setVideos([])
            return
        }

        async function fetchVideos() {
            setLoadingVideos(true)
            try {
                const res = await fetch(`/api/youtube/playlists/${selectedHolidayId}/videos`)
                const data = await res.json() as { videos: Video[] }
                if (data.videos) {
                    setVideos(data.videos)
                }
            } catch (error) {
                console.error('Failed to fetch videos:', error)
            } finally {
                setLoadingVideos(false)
            }
        }
        fetchVideos()
    }, [selectedHolidayId])

    if (loadingHolidays) return null
    if (holidays.length === 0) return null

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <h2 className="font-serif text-xl font-semibold text-primary">
                            Jewish Holidays
                        </h2>
                    </div>

                    <select
                        value={selectedHolidayId}
                        onChange={(e) => setSelectedHolidayId(e.target.value)}
                        className="p-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                        <option value="">Select a Holiday...</option>
                        {holidays.map(holiday => (
                            <option key={holiday.id} value={holiday.id}>
                                {holiday.title} ({holiday.videoCount})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white min-h-[100px]">
                {loadingVideos ? (
                    <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary/50" />
                        <p className="text-sm">Loading videos...</p>
                    </div>
                ) : selectedHolidayId && videos.length > 0 ? (
                    <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                        {videos.map((video) => (
                            <div
                                key={video.id}
                                className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors group"
                            >
                                <div className="relative w-24 aspect-video rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                                    <img
                                        src={video.thumbnail}
                                        alt={video.title}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <Play className="w-6 h-6 text-white opacity-80 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all" fill="currentColor" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-gray-900 group-hover:text-primary transition-colors line-clamp-2">
                                        {video.title}
                                    </h3>
                                </div>
                                <div>
                                    {video.slug ? (
                                        <Link
                                            href={`/${video.slug}`}
                                            className="px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all text-xs font-medium whitespace-nowrap"
                                        >
                                            View Shiur
                                        </Link>
                                    ) : (
                                        <a
                                            href={`https://youtube.com/watch?v=${video.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-full text-gray-400 hover:text-[#FF0000] hover:bg-[#FF0000]/5 transition-all"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : selectedHolidayId ? (
                    <div className="p-12 text-center text-muted-foreground">
                        No videos found in this playlist.
                    </div>
                ) : (
                    <div className="p-12 text-center text-muted-foreground bg-gray-50/30">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Select a holiday to browse shiurim</p>
                    </div>
                )}
            </div>
        </div>
    )
}
