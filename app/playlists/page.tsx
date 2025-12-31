import Header from '@/components/Header'
import { ExternalLink, Play } from 'lucide-react'
import { YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID } from '@/lib/youtube'

export const revalidate = 3600 // Revalidate every hour

const PLAYLIST_CATEGORIES = [
  {
    name: 'Bereishis',
    english: 'Genesis',
    keywords: ['bereishis', 'bereshit', 'genesis', 'בראשית', 'noach', 'lech lecha', 'vayeira', 'chayei sarah', 'toldos', 'vayetzei', 'vayishlach', 'vayeshev', 'mikeitz', 'vayigash', 'vayechi']
  },
  {
    name: 'Shemos',
    english: 'Exodus',
    keywords: ['shemos', 'shemot', 'exodus', 'שמות', 'va\'eira', 'vaeira', 'bo', 'beshalach', 'yisro', 'mishpatim', 'teruma', 'tetzave', 'ki sisa', 'vayakhel', 'pekudei']
  },
  {
    name: 'Vayikra',
    english: 'Leviticus',
    keywords: ['vayikra', 'leviticus', 'ויקרא', 'tzav', 'shemini', 'tazria', 'metzorah', 'acharei mos', 'kedoshim', 'emor', 'behar', 'bechukosai']
  },
  {
    name: 'Bamidbar',
    english: 'Numbers',
    keywords: ['bamidbar', 'numbers', 'במדבר', 'naso', 'behaalosecha', 'shelach', 'korach', 'chukas', 'balak', 'pinchas', 'matos', 'massei']
  },
  {
    name: 'Devarim',
    english: 'Deuteronomy',
    keywords: ['devarim', 'deuteronomy', 'דברים', 'va\'eschanan', 'vaeschanan', 'eikev', 're\'eh', 'shoftim', 'ki seitzei', 'ki savo', 'nitzavim', 'vayelech', 'ha\'azinu', 'v\'zos habracha', 'vzos habracha']
  },
  {
    name: 'Jewish Calendar',
    english: 'Holidays',
    keywords: ['calendar', 'holiday', 'moed', 'yom tov', 'rosh hashana', 'yom kippur', 'sukkos', 'sukkot', 'chanukah', 'hanukkah', 'purim', 'pesach', 'passover', 'sefira', 'lag ba\'omer', 'shavuos', 'shavuot', 'tisha b\'av', 'three weeks', 'elul', 'tishrei', 'nissan', 'adar']
  }
]

function getCategory(title: string): string | null {
  const lowerTitle = title.toLowerCase()
  for (const category of PLAYLIST_CATEGORIES) {
    if (category.keywords.some(keyword => lowerTitle.includes(keyword))) {
      return category.name
    }
  }
  return null
}

async function getPlaylists() {
  try {
    const playlistsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&channelId=${YOUTUBE_CHANNEL_ID}&maxResults=50&key=${YOUTUBE_API_KEY}`,
      { next: { revalidate: 3600 } }
    )

    if (!playlistsResponse.ok) {
      console.error('Failed to fetch playlists from YouTube API')
      return []
    }

    const playlistsData = await playlistsResponse.json() as any

    if (!playlistsData.items || playlistsData.items.length === 0) {
      return []
    }

    return playlistsData.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      videoCount: item.contentDetails?.itemCount || 0,
      publishedAt: item.snippet.publishedAt,
      playlistUrl: `https://www.youtube.com/playlist?list=${item.id}`,
      category: getCategory(item.snippet.title),
    }))
  } catch (error) {
    console.error('Error fetching playlists:', error)
    return []
  }
}

export default async function PlaylistsPage() {
  const playlists = await getPlaylists()

  // Group playlists by category
  const groupedPlaylists: Record<string, typeof playlists> = {}
  const ungroupedPlaylists: typeof playlists = []

  playlists.forEach((playlist: any) => {
    if (playlist.category) {
      if (!groupedPlaylists[playlist.category]) {
        groupedPlaylists[playlist.category] = []
      }
      groupedPlaylists[playlist.category].push(playlist)
    } else {
      ungroupedPlaylists.push(playlist)
    }
  })

  // Sort categories in order
  const sortedCategories = PLAYLIST_CATEGORIES.filter(cat => groupedPlaylists[cat.name])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-primary mb-2">
            Playlists
          </h1>
          <p className="text-muted-foreground">
            Browse curated collections of shiurim on YouTube
          </p>
        </div>

        {playlists.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 text-center">
            <p className="text-gray-600 mb-4">No playlists available at the moment.</p>
            <a
              href="https://www.youtube.com/@RabbiKraz/playlists"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              View playlists on YouTube
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Grouped by Category */}
            {sortedCategories.map((category) => {
              const categoryPlaylists = groupedPlaylists[category.name]
              return (
                <div key={category.name} className="space-y-6">
                  <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary border-b-2 border-primary pb-2">
                    {category.name} {category.english !== 'Holidays' && `(${category.english})`}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {categoryPlaylists.map((playlist: any) => (
                      <a
                        key={playlist.id}
                        href={`https://www.youtube.com/playlist?list=${playlist.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 overflow-hidden flex flex-col h-full group"
                      >
                        <div className="relative aspect-video bg-gray-200 overflow-hidden">
                          {playlist.thumbnail ? (
                            <img
                              src={playlist.thumbnail}
                              alt={playlist.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              <Play className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-3">
                              <Play className="w-6 h-6 text-primary" />
                            </div>
                          </div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                          <h3 className="font-serif text-xl font-semibold text-primary mb-2 line-clamp-2 group-hover:text-secondary transition-colors">
                            {playlist.title}
                          </h3>
                          {playlist.description && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">
                              {playlist.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-4 mt-auto border-t border-gray-50">
                            <span className="text-xs text-muted-foreground">
                              {playlist.videoCount || 0} {playlist.videoCount === 1 ? 'video' : 'videos'}
                            </span>
                            <span className="text-xs text-primary font-medium flex items-center gap-1 group-hover:text-secondary transition-colors">
                              Watch
                              <ExternalLink className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Ungrouped playlists */}
            {ungroupedPlaylists.length > 0 && (
              <div className="space-y-6">
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary border-b-2 border-primary pb-2">
                  Miscellaneous
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ungroupedPlaylists.map((playlist: any) => (
                    <a
                      key={playlist.id}
                      href={`https://www.youtube.com/playlist?list=${playlist.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 overflow-hidden flex flex-col h-full group"
                    >
                      <div className="relative aspect-video bg-gray-200 overflow-hidden">
                        {playlist.thumbnail ? (
                          <img
                            src={playlist.thumbnail}
                            alt={playlist.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <Play className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-3">
                            <Play className="w-6 h-6 text-primary" />
                          </div>
                        </div>
                      </div>
                      <div className="p-5 flex-1 flex flex-col">
                        <h3 className="font-serif text-xl font-semibold text-primary mb-2 line-clamp-2 group-hover:text-secondary transition-colors">
                          {playlist.title}
                        </h3>
                        {playlist.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">
                            {playlist.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between pt-4 mt-auto border-t border-gray-50">
                          <span className="text-xs text-muted-foreground">
                            {playlist.videoCount || 0} {playlist.videoCount === 1 ? 'video' : 'videos'}
                          </span>
                          <span className="text-xs text-primary font-medium flex items-center gap-1 group-hover:text-secondary transition-colors">
                            Watch
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
