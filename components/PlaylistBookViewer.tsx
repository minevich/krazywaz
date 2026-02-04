'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Youtube, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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

export default function PlaylistBookViewer() {
    const [categories, setCategories] = useState<CategoryData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [openCategory, setOpenCategory] = useState<string | null>(null)

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

                // Open first category by default
                if (categoriesArray.length > 0) {
                    setOpenCategory(categoriesArray[0].name)
                }
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
        <div className="max-w-3xl mx-auto space-y-4">
            {categories.map((category) => (
                <div key={category.name} className="border border-white/10 rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm">
                    {/* Category Header (Clickable) */}
                    <button
                        onClick={() => toggleCategory(category.name)}
                        className="w-full flex items-center justify-between p-4 md:p-6 text-left transition-colors hover:bg-white/5"
                    >
                        <h2 className="text-xl md:text-2xl font-serif font-bold text-blue-100 flex items-center gap-3">
                            <span className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-sm md:text-base border border-blue-400/30">
                                {category.name[0]}
                            </span>
                            {category.name}
                            <span className="text-sm font-normal text-gray-400">
                                ({category.playlists.length})
                            </span>
                        </h2>
                        {openCategory === category.name ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                    </button>

                    {/* Playlist List (Collapsible) */}
                    <div
                        className={cn(
                            "transition-all duration-300 ease-in-out border-t border-white/5 overflow-hidden",
                            openCategory === category.name ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                        )}
                    >
                        <div className="divide-y divide-white/5">
                            {category.playlists.map((playlist) => (
                                <a
                                    key={playlist.id}
                                    href={playlist.playlistUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-4 pl-6 md:pl-16 hover:bg-white/5 transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        {playlist.thumbnail && (
                                            <img
                                                src={playlist.thumbnail}
                                                alt={playlist.title}
                                                className="w-16 h-10 object-cover rounded hidden md:block"
                                            />
                                        )}
                                        <div>
                                            <span className="text-base md:text-lg text-gray-200 font-medium tracking-wide group-hover:text-white transition-colors">
                                                {playlist.title}
                                            </span>
                                            <p className="text-sm text-gray-500">
                                                {playlist.videoCount} videos
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-2 bg-red-600/10 text-red-400 rounded-full group-hover:bg-red-600 group-hover:text-white transition-all transform group-hover:scale-110">
                                        <Youtube className="w-4 h-4 md:w-5 md:h-5" />
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
