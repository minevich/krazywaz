'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// Platform icon components
const YouTubeIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
)

const SpotifyIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
)

const AppleIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
)

const AmazonIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M.045 18.02c.072-.116.187-.124.348-.022 3.636 2.11 7.594 3.166 11.87 3.166 2.852 0 5.668-.533 8.447-1.595l.315-.14c.138-.06.234-.1.293-.065.053.024.086.081.086.162 0 .057-.02.132-.06.223-.36.85-1.15 1.86-2.37 3.037-.084.082-.153.114-.206.092-.053-.023-.074-.07-.074-.146 0-.024.004-.054.012-.092.044-.177.07-.364.07-.563 0-.332-.105-.516-.315-.516-.115 0-.225.038-.343.116-.56.37-1.313.555-2.265.555-.82 0-1.608-.148-2.366-.443-.755-.295-1.424-.698-2.01-1.208-.586-.51-1.052-1.088-1.403-1.737-.35-.65-.524-1.332-.524-2.047 0-.53.114-1.002.342-1.425a2.15 2.15 0 0 1 .943-.97c.4-.226.826-.34 1.28-.34.48 0 .933.094 1.362.285.428.19.808.447 1.14.77.33.323.6.697.812 1.12.213.423.37.862.48 1.322.053.213.13.376.23.488.097.112.233.167.406.167.175 0 .315-.066.42-.198.108-.132.162-.316.162-.555 0-.098-.01-.206-.027-.323a23.91 23.91 0 0 0-.47-2.235 18.78 18.78 0 0 0-.704-2.075 11.79 11.79 0 0 0-.943-1.82 8.24 8.24 0 0 0-1.185-1.515 6.22 6.22 0 0 0-1.428-1.065 4.81 4.81 0 0 0-1.67-.61 6.15 6.15 0 0 0-1.853-.02 6.7 6.7 0 0 0-1.83.577 7.53 7.53 0 0 0-1.608 1.04 8.55 8.55 0 0 0-1.345 1.454 10.03 10.03 0 0 0-1.05 1.792c-.283.63-.505 1.277-.664 1.943a9.04 9.04 0 0 0-.234 2.107c0 .79.087 1.56.26 2.31.174.75.421 1.463.74 2.14.32.676.704 1.302 1.153 1.877.45.575.95 1.076 1.5 1.5.55.425 1.136.755 1.76.99.62.236 1.26.354 1.917.354.657 0 1.283-.118 1.88-.354.594-.235 1.124-.565 1.59-.99.464-.424.87-.925 1.22-1.5.35-.575.65-1.2.9-1.877.25-.677.445-1.39.586-2.14.14-.75.21-1.52.21-2.31 0-.46-.022-.926-.067-1.397a12.68 12.68 0 0 0-.216-1.382 10.98 10.98 0 0 0-.4-1.392 9.29 9.29 0 0 0-.58-1.288 7.89 7.89 0 0 0-.753-1.152 6.8 6.8 0 0 0-.92-.974 5.8 5.8 0 0 0-1.08-.754 5.03 5.03 0 0 0-1.22-.488 4.44 4.44 0 0 0-1.35-.175c-.52 0-1.02.07-1.5.21-.48.14-.926.344-1.34.61a5.5 5.5 0 0 0-1.115.953 6.22 6.22 0 0 0-.86 1.23z" />
    </svg>
)

const YouTubeMusicIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z" />
    </svg>
)

const PocketIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.813 10.259l-5.646 5.419a1.649 1.649 0 0 1-2.282 0l-5.646-5.419a1.649 1.649 0 1 1 2.282-2.377L12 12.009l4.479-4.127a1.649 1.649 0 1 1 2.334 2.377zM20.25 0H3.75A3.75 3.75 0 0 0 0 3.75v7.5A12.054 12.054 0 0 0 12 23.25 12.054 12.054 0 0 0 24 11.25v-7.5A3.75 3.75 0 0 0 20.25 0z" />
    </svg>
)

const CastboxIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12 12-5.373 12-12S18.628 0 12 0zm5.558 16.858c-.353.707-.988 1.179-1.741 1.429-.588.157-1.2.213-1.812.213H9.996c-.612 0-1.224-.056-1.812-.213-.753-.25-1.388-.722-1.741-1.429-.353-.707-.423-1.509-.423-2.286V9.428c0-.777.07-1.579.423-2.286.353-.707.988-1.179 1.741-1.429.588-.157 1.2-.213 1.812-.213h4.009c.612 0 1.224.056 1.812.213.753.25 1.388.722 1.741 1.429.353.707.423 1.509.423 2.286v5.144c0 .777-.07 1.579-.423 2.286z" />
    </svg>
)

const TwentyFourSixIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <rect width="24" height="24" rx="4" />
        <text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">24/6</text>
    </svg>
)

// Parsha names for each Chumash to match playlist titles
const CHUMASH_PARSHAS: Record<string, string[]> = {
    'Bereishis': [
        'Bereishis', 'Bereshit', 'Genesis',
        'Noach', 'Noah',
        'Lech Lecha', 'Lech-Lecha',
        'Vayera', 'Vayeira',
        'Chayei Sarah', 'Chayei-Sarah', 'Chaye Sarah',
        'Toldos', 'Toldot', 'Toledot',
        'Vayetzei', 'Vayetze',
        'Vayishlach', 'Vayishlah',
        'Vayeshev', 'Vayeishev',
        'Miketz', 'Mikeitz',
        'Vayigash',
        'Vayechi', 'Vaychi'
    ],
    'Shemos': [
        'Shemos', 'Shemot', 'Exodus',
        'Vaera', 'Va\'era',
        'Bo',
        'Beshalach', 'Beshallach',
        'Yisro', 'Yitro', 'Jethro',
        'Mishpatim',
        'Terumah', 'Trumah',
        'Tetzaveh', 'Tetzave',
        'Ki Tisa', 'Ki Tissa', 'Ki-Tisa',
        'Vayakhel', 'Vayakeil',
        'Pekudei', 'Pekude'
    ],
    'Vayikra': [
        'Vayikra', 'Leviticus',
        'Tzav', 'Tsav',
        'Shemini', 'Shmini',
        'Tazria', 'Tazri\'a',
        'Metzora', 'Metzorah',
        'Acharei Mot', 'Acharei', 'Achrei Mot',
        'Kedoshim', 'Kdoshim',
        'Emor',
        'Behar', 'B\'har',
        'Bechukotai', 'Bechukosai', 'Behukotai'
    ],
    'Bamidbar': [
        'Bamidbar', 'Bemidbar', 'Numbers',
        'Nasso', 'Naso',
        'Behaalotecha', 'Beha\'alotcha', 'Behaalosecha',
        'Shelach', 'Shlach', 'Sh\'lach',
        'Korach', 'Korah',
        'Chukat', 'Chukkat', 'Hukat',
        'Balak',
        'Pinchas', 'Pinhas', 'Phineas',
        'Matot', 'Matos',
        'Masei', 'Masse', 'Masey'
    ],
    'Devarim': [
        'Devarim', 'Deuteronomy', 'D\'varim',
        'Vaetchanan', 'Va\'etchanan', 'Vaeschanan',
        'Eikev', 'Ekev',
        'Reeh', 'Re\'eh', 'R\'eih',
        'Shoftim', 'Shofetim',
        'Ki Teitzei', 'Ki Tetzei', 'Ki Tetze', 'Ki-Teitzei',
        'Ki Tavo', 'Ki Savo', 'Ki-Tavo',
        'Nitzavim', 'Nitsavim',
        'Vayeilech', 'Vayelech',
        'Haazinu', 'Ha\'azinu',
        'Vezot Haberakhah', 'V\'zot Habracha', 'Zos Habracha'
    ]
}

interface Playlist {
    id: string
    title: string
    description: string
    thumbnail: string
    videoCount: number
    playlistUrl: string
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

function categorizePlaylist(title: string): string {
    const lowerTitle = title.toLowerCase()

    for (const [chumash, parshas] of Object.entries(CHUMASH_PARSHAS)) {
        for (const parsha of parshas) {
            if (lowerTitle.includes(parsha.toLowerCase())) {
                return chumash
            }
        }
    }

    return 'Misc'
}

// Platform link button component
function PlatformButton({
    href,
    icon: Icon,
    label,
    color
}: {
    href: string | null
    icon: React.FC<{ className?: string }>
    label: string
    color: string
}) {
    if (!href) return null

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={label}
            className={cn(
                "p-2 rounded-full transition-all duration-200 hover:scale-110",
                color
            )}
        >
            <Icon className="w-4 h-4" />
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
        async function fetchPlaylists() {
            try {
                const response = await fetch('/api/youtube/playlists')
                if (!response.ok) {
                    throw new Error('Failed to fetch playlists')
                }

                const playlists: Playlist[] = await response.json()

                // Categorize playlists
                const categoryMap: Record<string, Playlist[]> = {
                    'Bereishis': [],
                    'Shemos': [],
                    'Vayikra': [],
                    'Bamidbar': [],
                    'Devarim': [],
                    'Misc': []
                }

                for (const playlist of playlists) {
                    const category = categorizePlaylist(playlist.title)
                    categoryMap[category].push(playlist)
                }

                // Convert to array and filter out empty categories
                const categoriesArray: CategoryData[] = Object.entries(categoryMap)
                    .filter(([_, playlists]) => playlists.length > 0)
                    .map(([name, playlists]) => ({
                        name,
                        playlists: playlists.sort((a, b) => a.title.localeCompare(b.title))
                    }))

                setCategories(categoriesArray)
            } catch (err: any) {
                setError(err.message || 'Failed to load playlists')
            } finally {
                setLoading(false)
            }
        }

        fetchPlaylists()
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
                                            {playlist.thumbnail && (
                                                <img
                                                    src={playlist.thumbnail}
                                                    alt={playlist.title}
                                                    className="w-16 h-10 object-cover rounded hidden md:block"
                                                />
                                            )}
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
                                                                icon={YouTubeIcon}
                                                                label="YouTube"
                                                                color="bg-red-100 text-red-600 hover:bg-red-600 hover:text-white"
                                                            />
                                                            <PlatformButton
                                                                href={video.platforms.youtubeMusic}
                                                                icon={YouTubeMusicIcon}
                                                                label="YouTube Music"
                                                                color="bg-red-100 text-red-600 hover:bg-red-600 hover:text-white"
                                                            />
                                                            <PlatformButton
                                                                href={video.platforms.spotify}
                                                                icon={SpotifyIcon}
                                                                label="Spotify"
                                                                color="bg-green-100 text-green-600 hover:bg-green-600 hover:text-white"
                                                            />
                                                            <PlatformButton
                                                                href={video.platforms.apple}
                                                                icon={AppleIcon}
                                                                label="Apple Podcasts"
                                                                color="bg-purple-100 text-purple-600 hover:bg-purple-600 hover:text-white"
                                                            />
                                                            <PlatformButton
                                                                href={video.platforms.amazon}
                                                                icon={AmazonIcon}
                                                                label="Amazon Music"
                                                                color="bg-orange-100 text-orange-600 hover:bg-orange-600 hover:text-white"
                                                            />
                                                            <PlatformButton
                                                                href={video.platforms.pocket}
                                                                icon={PocketIcon}
                                                                label="Pocket Casts"
                                                                color="bg-pink-100 text-pink-600 hover:bg-pink-600 hover:text-white"
                                                            />
                                                            <PlatformButton
                                                                href={video.platforms.castbox}
                                                                icon={CastboxIcon}
                                                                label="Castbox"
                                                                color="bg-orange-100 text-orange-600 hover:bg-orange-600 hover:text-white"
                                                            />
                                                            <PlatformButton
                                                                href={video.platforms.twentyFourSix}
                                                                icon={TwentyFourSixIcon}
                                                                label="24Six"
                                                                color="bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white"
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
