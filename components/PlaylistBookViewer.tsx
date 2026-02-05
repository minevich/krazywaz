'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Playlist {
    id: string
    title: string
    description: string
    thumbnail: string
    videoCount: number
    playlistUrl: string
    category?: string
}

interface VideoWithLinks {
    id: string
    title: string
    thumbnail: string
    duration: string
    position: number
    shiurId: string | null
    slug: string | null
    platforms: {
        youtube: string | null
        youtubeMusic: string | null
        spotify: string | null
        apple: string | null
        amazon: string | null
        pocket: string | null
        twentyFourSix: string | null
        castbox: string | null
    }
}

interface CategoryData {
    name: string
    playlists: Playlist[]
}

// Custom SVG icons for platforms not in Font Awesome
const YouTubeMusicSvg = (
    <svg viewBox="0 0 176 176" className="w-5 h-5">
        <circle className="fill-[#FF0000]" cx="88" cy="88" r="88" />
        <path fill="#ffffff" d="M88,46c23.1,0,42,18.8,42,42s-18.8,42-42,42s-42-18.8-42-42S64.9,46,88,46 M88,42c-25.4,0-46,20.6-46,46s20.6,46,46,46s46-20.6,46-46S113.4,42,88,42L88,42z" />
        <polygon fill="#ffffff" points="72,111 111,87 72,65" />
    </svg>
)

const PocketCastsSvg = (
    <svg viewBox="0 0 32 32" className="w-5 h-5">
        <circle cx="16" cy="15" r="15" fill="white" />
        <path className="fill-[#F43E37]" fillRule="evenodd" clipRule="evenodd" d="M16 32c8.837 0 16-7.163 16-16S24.837 0 16 0 0 7.163 0 16s7.163 16 16 16Zm0-28.444C9.127 3.556 3.556 9.127 3.556 16c0 6.873 5.571 12.444 12.444 12.444v-3.11A9.333 9.333 0 1 1 25.333 16h3.111c0-6.874-5.571-12.445-12.444-12.445ZM8.533 16A7.467 7.467 0 0 0 16 23.467v-2.715A4.751 4.751 0 1 1 20.752 16h2.715a7.467 7.467 0 0 0-14.934 0Z" />
    </svg>
)

const CastboxSvg = (
    <svg className="w-5 h-5" viewBox="0 0 512 512">
        <path className="fill-[#F55B23]" d="M396,512H116C51.93,512,0,460.07,0,396V116C0,51.93,51.93,0,116,0h280c64.07,0,116,51.93,116,116v280C512,460.07,460.07,512,396,512z" />
        <g>
            <path fill="#ffffff" d="M284.36,172.15c-9.5,0-17.22,7.32-17.22,16.35v39.56c0,5-4.63,9.05-10.33,9.05c-5.71,0-10.34-4.05-10.34-9.05v-53.82c0-9.04-7.71-16.36-17.22-16.36c-9.51,0-17.22,7.32-17.22,16.36v43.14c0,4.99-4.63,9.05-10.34,9.05c-5.7,0-10.33-4.06-10.33-9.05v-15.63c0-9.03-7.72-16.35-17.22-16.35c-9.51,0-17.22,7.32-17.22,16.35v37.01c0,4.99-4.63,9.05-10.34,9.05c-5.7,0-10.33-4.06-10.33-9.05v-4.3c0-9.45-7.71-17.11-17.22-17.11c-9.51,0-17.22,7.66-17.22,17.11v51.37c0,9.45,7.7,17.12,17.22,17.12c9.5,0,17.22-7.67,17.22-17.12v-4.3c0-4.99,4.63-9.05,10.33-9.05c5.71,0,10.34,4.06,10.34,9.05v58.72c0,9.03,7.7,16.36,17.22,16.36c9.5,0,17.22-7.33,17.22-16.36v-80.1c0-4.99,4.63-9.05,10.33-9.05c5.71,0,10.34,4.06,10.34,9.05v40.35c0,9.04,7.7,16.36,17.22,16.36c9.5,0,17.22-7.32,17.22-16.36v-29.67c0-4.99,4.63-9.05,10.34-9.05c5.7,0,10.33,4.06,10.33,9.05v31.71c0,9.03,7.71,16.35,17.22,16.35c9.51,0,17.22-7.32,17.22-16.35V188.5C301.58,179.47,293.88,172.15,284.36,172.15" />
            <path fill="#ffffff" d="M339.46,216.33c-9.51,0-17.22,7.32-17.22,16.35v65.13c0,9.03,7.7,16.35,17.22,16.35c9.5,0,17.22-7.32,17.22-16.35v-65.13C356.68,223.65,348.97,216.33,339.46,216.33" />
            <path fill="#ffffff" d="M394.56,249.45c-9.5,0-17.22,7.32-17.22,16.35v16.21c0,9.03,7.71,16.35,17.22,16.35c9.51,0,17.22-7.32,17.22-16.35V265.8C411.78,256.77,404.08,249.45,394.56,249.45" />
        </g>
    </svg>
)

// Platform configurations with Font Awesome icons and custom SVGs
const PLATFORM_CONFIG: Record<string, { icon?: string; svg?: JSX.Element; label: string }> = {
    youtube: { icon: 'fab fa-youtube', label: 'YouTube' },
    youtubeMusic: { svg: YouTubeMusicSvg, label: 'YouTube Music' },
    spotify: { icon: 'fab fa-spotify', label: 'Spotify' },
    apple: { icon: 'fab fa-apple', label: 'Apple Podcasts' },
    amazon: { icon: 'fab fa-amazon', label: 'Amazon Music' },
    pocket: { svg: PocketCastsSvg, label: 'Pocket Casts' },
    castbox: { svg: CastboxSvg, label: 'Castbox' },
    twentyFourSix: { icon: 'fas fa-mobile-alt', label: '24Six' },
}

// Platform link button component - matches PlatformGrid style
function PlatformButton({
    href,
    platform
}: {
    href: string | null
    platform: keyof typeof PLATFORM_CONFIG
}) {
    if (!href) return null

    const config = PLATFORM_CONFIG[platform]
    if (!config) return null

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={config.label}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer"
        >
            {config.svg ? (
                <div className="w-5 h-5">{config.svg}</div>
            ) : config.icon ? (
                <i className={`${config.icon} text-lg text-[#4a90e2] group-hover:text-primary transition-colors`}></i>
            ) : null}
        </a>
    )
}

export default function PlaylistBookViewer() {
    const [categories, setCategories] = useState<CategoryData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [openCategory, setOpenCategory] = useState<string | null>(null)
    const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null)
    const [playlistVideos, setPlaylistVideos] = useState<Record<string, VideoWithLinks[]>>({})
    const [loadingPlaylist, setLoadingPlaylist] = useState<string | null>(null)

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch categories and playlists in parallel
                const [catsResponse, playlistsResponse] = await Promise.all([
                    fetch('/api/categories'),
                    fetch('/api/youtube/playlists') // This now returns merged Manual + Synced
                ])

                if (!catsResponse.ok) throw new Error('Failed to fetch categories')
                if (!playlistsResponse.ok) throw new Error('Failed to fetch playlists')

                const systemCatsData = await catsResponse.json()
                const systemCats: { name: string, rules: { name: string, keywords: string[] }[] }[] = Array.isArray(systemCatsData) ? systemCatsData : []
                const playlists: Playlist[] = await playlistsResponse.json()

                // Filter out unwanted playlists
                const filteredPlaylists = playlists.filter(p =>
                    !p.title.toLowerCase().includes("rabbi kraz's shiurim")
                )

                // Initialize map with dynamic categories + Misc
                const categoryMap: Record<string, Playlist[]> = {}
                systemCats.forEach(c => categoryMap[c.name] = [])
                categoryMap['Misc'] = []

                // Function to find rule index for sorting
                const getRuleIndex = (catName: string, title: string) => {
                    const cat = systemCats.find(c => c.name === catName)
                    if (!cat) return -1
                    const lowerTitle = title.toLowerCase()
                    return cat.rules.findIndex(rule =>
                        rule.keywords.some(k => lowerTitle.includes(k.toLowerCase()))
                    )
                }

                // Group playlists
                for (const playlist of filteredPlaylists) {
                    // Use existing category from DB if valid, else Misc
                    // Note: 'category' field from API is trusted now
                    const catName = playlist.category && categoryMap[playlist.category] ? playlist.category : 'Misc'
                    categoryMap[catName].push(playlist)
                }

                // Build final array preserving system category order
                const result: CategoryData[] = []

                // Add system categories in order
                for (const sysCat of systemCats) {
                    if (categoryMap[sysCat.name] && categoryMap[sysCat.name].length > 0) {
                        result.push({
                            name: sysCat.name,
                            playlists: categoryMap[sysCat.name].sort((a, b) => {
                                const idxA = getRuleIndex(sysCat.name, a.title)
                                const idxB = getRuleIndex(sysCat.name, b.title)

                                // Logic: matched rules come first in rule-order
                                if (idxA !== -1 && idxB !== -1) return idxA - idxB
                                if (idxA !== -1) return -1
                                if (idxB !== -1) return 1

                                return a.title.localeCompare(b.title)
                            })
                        })
                    }
                }

                // Add Misc if not empty
                if (categoryMap['Misc'].length > 0) {
                    result.push({
                        name: 'Misc',
                        playlists: categoryMap['Misc'].sort((a, b) => a.title.localeCompare(b.title))
                    })
                }

                setCategories(result)
            } catch (err: any) {
                setError(err.message || 'Failed to load data')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    const toggleCategory = (categoryName: string) => {
        setOpenCategory(openCategory === categoryName ? null : categoryName)
    }

    const togglePlaylist = async (playlistId: string) => {
        if (expandedPlaylist === playlistId) {
            setExpandedPlaylist(null)
            return
        }

        setExpandedPlaylist(playlistId)

        // Fetch videos if not already loaded
        if (!playlistVideos[playlistId]) {
            setLoadingPlaylist(playlistId)
            try {
                const response = await fetch(`/api/youtube/playlists/${playlistId}/videos`)
                if (!response.ok) {
                    throw new Error('Failed to fetch playlist videos')
                }
                const data = await response.json() as { videos: VideoWithLinks[] }
                setPlaylistVideos(prev => ({
                    ...prev,
                    [playlistId]: data.videos
                }))
            } catch (err: any) {
                console.error('Error fetching playlist videos:', err)
            } finally {
                setLoadingPlaylist(null)
            }
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-lg text-muted-foreground">Loading playlists...</span>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center py-20">
                <p className="text-red-500">{error}</p>
            </div>
        )
    }

    if (categories.length === 0) {
        return (
            <div className="text-center py-20">
                <p className="text-muted-foreground">No playlists found.</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-4">
            {categories.map((category) => (
                <div key={category.name} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    {/* Category Header (Clickable) */}
                    <button
                        onClick={() => toggleCategory(category.name)}
                        className="w-full flex items-center justify-between p-4 md:p-6 text-left transition-colors hover:bg-gray-50"
                    >
                        <h2 className="text-xl md:text-2xl font-serif font-bold text-primary flex items-center gap-3">
                            <span className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm md:text-base text-primary border border-primary/20">
                                {category.name[0]}
                            </span>
                            {category.name}
                            <span className="text-sm font-normal text-muted-foreground">
                                ({category.playlists.length})
                            </span>
                        </h2>
                        {openCategory === category.name ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                    </button>

                    {/* Playlist List (Collapsible) */}
                    <div
                        className={cn(
                            "transition-all duration-300 ease-in-out border-t border-gray-100 overflow-hidden",
                            openCategory === category.name ? "max-h-[5000px] opacity-100" : "max-h-0 opacity-0"
                        )}
                    >
                        <div className="divide-y divide-gray-100">
                            {category.playlists.map((playlist) => (
                                <div key={playlist.id}>
                                    {/* Playlist Header */}
                                    <button
                                        onClick={() => togglePlaylist(playlist.id)}
                                        className="w-full flex items-center justify-between p-4 pl-6 md:pl-16 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-left">
                                                <span className="text-base md:text-lg text-gray-800 font-medium tracking-wide">
                                                    {playlist.title}
                                                </span>
                                                <p className="text-sm text-muted-foreground">
                                                    {playlist.videoCount} shiurim
                                                </p>
                                            </div>
                                        </div>
                                        {expandedPlaylist === playlist.id ? (
                                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                        )}
                                    </button>

                                    {/* Expanded Playlist Videos */}
                                    <div
                                        className={cn(
                                            "transition-all duration-300 ease-in-out overflow-hidden bg-gray-50",
                                            expandedPlaylist === playlist.id ? "max-h-[3000px] opacity-100" : "max-h-0 opacity-0"
                                        )}
                                    >
                                        {loadingPlaylist === playlist.id ? (
                                            <div className="flex items-center justify-center py-8">
                                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                                <span className="ml-2 text-muted-foreground">Loading shiurim...</span>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-gray-200">
                                                {playlistVideos[playlist.id]?.map((video) => (
                                                    <div
                                                        key={video.id}
                                                        className="p-4 pl-10 md:pl-24 flex flex-col md:flex-row md:items-center gap-4"
                                                    >
                                                        {/* Video Info */}
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            <img
                                                                src={video.thumbnail}
                                                                alt={video.title}
                                                                className="w-20 h-12 object-cover rounded flex-shrink-0"
                                                            />
                                                            <div className="min-w-0 flex-1">
                                                                {video.slug ? (
                                                                    <Link
                                                                        href={`/${video.slug}`}
                                                                        className="text-sm md:text-base font-medium text-gray-800 hover:text-primary transition-colors line-clamp-2"
                                                                    >
                                                                        {video.title}
                                                                    </Link>
                                                                ) : (
                                                                    <span className="text-sm md:text-base font-medium text-gray-800 line-clamp-2">
                                                                        {video.title}
                                                                    </span>
                                                                )}
                                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                                    {video.duration}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {/* Platform Links */}
                                                        <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                                                            <PlatformButton
                                                                href={video.platforms.youtube}
                                                                platform="youtube"
                                                            />
                                                            <PlatformButton
                                                                href={video.platforms.youtubeMusic}
                                                                platform="youtubeMusic"
                                                            />
                                                            <PlatformButton
                                                                href={video.platforms.spotify}
                                                                platform="spotify"
                                                            />
                                                            <PlatformButton
                                                                href={video.platforms.apple}
                                                                platform="apple"
                                                            />
                                                            <PlatformButton
                                                                href={video.platforms.amazon}
                                                                platform="amazon"
                                                            />
                                                            <PlatformButton
                                                                href={video.platforms.pocket}
                                                                platform="pocket"
                                                            />
                                                            <PlatformButton
                                                                href={video.platforms.castbox}
                                                                platform="castbox"
                                                            />
                                                            <PlatformButton
                                                                href={video.platforms.twentyFourSix}
                                                                platform="twentyFourSix"
                                                            />
                                                            {video.slug && (
                                                                <Link
                                                                    href={`/${video.slug}`}
                                                                    title="View Shiur Page"
                                                                    className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 hover:scale-110"
                                                                >
                                                                    <ExternalLink className="w-4 h-4" />
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
