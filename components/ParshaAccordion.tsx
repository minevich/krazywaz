'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, BookOpen, Loader2, Youtube } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Playlist {
    id: string
    title: string
    description: string
    thumbnail: string
    videoCount: number
    playlistUrl: string
}

interface ParshaData {
    parsha: string
    parshaHebrew: string
    shabbosDate: string
}

// Normalize parsha name for matching (handles spelling variations)
function normalizeForMatch(name: string): string {
    return name
        .toLowerCase()
        .replace(/['-]/g, '')
        .replace(/parashat?\s*/i, '')
        .replace(/^bo$/, 'bo ') // Prevent 'bo' from matching 'bamidbar'
        .trim()
}

// Check if a playlist title matches the parsha
function playlistMatchesParsha(playlistTitle: string, parshaName: string): boolean {
    const normalizedPlaylist = normalizeForMatch(playlistTitle)
    const normalizedParsha = normalizeForMatch(parshaName)

    // Check if the parsha name appears in the playlist title
    return normalizedPlaylist.includes(normalizedParsha) ||
        normalizedParsha.includes(normalizedPlaylist)
}

export default function ParshaAccordion() {
    const [isOpen, setIsOpen] = useState(false)
    const [parshaData, setParshaData] = useState<ParshaData | null>(null)
    const [matchingPlaylist, setMatchingPlaylist] = useState<Playlist | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch current parsha and playlists in parallel
                const [parshaRes, playlistsRes] = await Promise.all([
                    fetch('/api/parsha'),
                    fetch('/api/youtube/playlists')
                ])

                if (!parshaRes.ok) {
                    throw new Error('Failed to fetch parsha')
                }
                const parshaJson = await parshaRes.json() as ParshaData
                setParshaData(parshaJson)

                if (playlistsRes.ok) {
                    const playlists: Playlist[] = await playlistsRes.json()

                    // Find matching playlist for this parsha
                    const match = playlists.find(p =>
                        playlistMatchesParsha(p.title, parshaJson.parsha)
                    )
                    setMatchingPlaylist(match || null)
                }
            } catch (err: any) {
                console.error('Error loading parsha data:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

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
                        isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 border-t-0"
                    )}
                >
                    <div className="p-4 md:p-5">
                        {matchingPlaylist ? (
                            <a
                                href={matchingPlaylist.playlistUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100 group"
                            >
                                {matchingPlaylist.thumbnail && (
                                    <img
                                        src={matchingPlaylist.thumbnail}
                                        alt={matchingPlaylist.title}
                                        className="w-24 h-14 object-cover rounded hidden md:block"
                                    />
                                )}
                                <div className="flex-1">
                                    <h3 className="font-serif font-semibold text-primary group-hover:text-secondary transition-colors">
                                        {matchingPlaylist.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {matchingPlaylist.videoCount} videos on YouTube
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
