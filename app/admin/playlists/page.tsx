'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, RefreshCw, ChevronRight, ListMusic, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
// We can reuse the Toast hook if it's exported, or just use simple layout
import { useToast } from '@/components/Toast'

interface Playlist {
    id: string
    title: string
    description?: string
    category?: string
    itemCount: number
    updatedAt: string
}

interface SyncedPlaylist {
    id: string
    title: string
    description?: string
    thumbnail?: string
    videoCount: number
    category?: string
    lastSynced?: string
}

interface YouTubeSyncResponse {
    success?: boolean
    playlistCount?: number
    videoCount?: number
    error?: string
}

interface PlaylistsResponse {
    manual?: Playlist[]
    synced?: SyncedPlaylist[]
    // Fallback for array if API implementation varies
    [key: string]: any
}

export default function AdminPlaylistsPage() {
    const [manualPlaylists, setManualPlaylists] = useState<Playlist[]>([])
    const [syncedPlaylists, setSyncedPlaylists] = useState<SyncedPlaylist[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [syncingYouTube, setSyncingYouTube] = useState(false)
    const router = useRouter()
    const toast = useToast()

    useEffect(() => {
        fetchPlaylists()
    }, [])

    const fetchPlaylists = async () => {
        try {
            const response = await fetch('/api/admin/playlists', { cache: 'no-store' })
            const data = await response.json() as PlaylistsResponse | Playlist[]

            if (Array.isArray(data)) {
                setManualPlaylists(data)
            } else {
                if (data.manual) setManualPlaylists(data.manual)
                if (data.synced) setSyncedPlaylists(data.synced)
            }
        } catch (error) {
            console.error('Error fetching playlists:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async () => {
        const title = prompt('Enter playlist title:')
        if (!title) return

        setCreating(true)
        try {
            const response = await fetch('/api/admin/playlists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, category: 'Series' }) // Default category
            })

            const newPlaylist = await response.json() as Playlist & { error?: string }
            if (response.ok) {
                toast.success('Playlist created')
                router.push(`/admin/playlists/${newPlaylist.id}`)
            } else {
                toast.error('Error creating playlist', newPlaylist.error)
            }
        } catch (error) {
            toast.error('Error creating playlist')
        } finally {
            setCreating(false)
        }
    }

    const handleSyncYouTube = async () => {
        setSyncingYouTube(true)
        try {
            const response = await fetch('/api/admin/sync-youtube', {
                method: 'POST'
            })
            const data = await response.json() as YouTubeSyncResponse
            if (data.success) {
                toast.success(
                    'YouTube data synced!',
                    `${data.playlistCount} playlists, ${data.videoCount} videos`
                )
            } else {
                toast.error('Sync failed', data.error)
            }
        } catch (error: any) {
            toast.error('Sync failed', error.message)
        } finally {
            setSyncingYouTube(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link href="/admin" className="text-gray-500 hover:text-gray-900">
                            Dashboard
                        </Link>
                        <span className="text-gray-300">/</span>
                        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                            <ListMusic className="w-6 h-6" />
                            Playlists
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin/settings/categories"
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <ListMusic className="w-4 h-4" />
                            Manage Categories
                        </Link>
                        <button
                            onClick={handleSyncYouTube}
                            disabled={syncingYouTube}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 border border-blue-200"
                        >
                            <RefreshCw className={`w-4 h-4 ${syncingYouTube ? 'animate-spin' : ''}`} />
                            {syncingYouTube ? 'Syncing...' : 'Sync'}
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={creating}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" />
                            Create
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">

                {loading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-gray-500">Loading playlists...</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* Manual Playlists */}
                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <ListMusic className="w-5 h-5" /> Custom Playlists
                            </h2>
                            {manualPlaylists.length === 0 ? (
                                <div className="text-center py-8 bg-white rounded-xl border border-gray-200 border-dashed">
                                    <p className="text-gray-500 mb-4">No custom playlists yet.</p>
                                    <button onClick={handleCreate} className="text-primary hover:underline">Create one</button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {manualPlaylists.map(playlist => (
                                        <Link href={`/admin/playlists/${playlist.id}`} key={playlist.id} className="block group">
                                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all duration-200">
                                                <div className="p-6">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-primary transition-colors">{playlist.title}</h3>
                                                        <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{playlist.category || 'Uncategorized'}</span>
                                                    </div>
                                                    <p className="text-gray-500 text-sm mb-4 line-clamp-2 min-h-[1.25rem]">{playlist.description || 'No description'}</p>
                                                    <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                                                        <span>{playlist.itemCount} videos</span>
                                                        <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">Manage <ChevronRight className="w-4 h-4" /></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Synced Playlists */}
                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <RefreshCw className="w-5 h-5" /> Synced from YouTube
                                <span className="text-sm font-normal text-gray-500 ml-2">Cannot edit items here</span>
                            </h2>
                            {syncedPlaylists.length === 0 ? (
                                <div className="text-center py-8 bg-white rounded-xl border border-gray-200 border-dashed">
                                    <p className="text-gray-500">No synced playlists found. Click "Sync" above.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {syncedPlaylists.map(playlist => (
                                        <div key={playlist.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden opacity-90 hover:opacity-100 transition-opacity">
                                            <div className="p-6">
                                                <div className="flex items-start justify-between mb-2">
                                                    <h3 className="font-bold text-lg text-gray-900">{playlist.title}</h3>
                                                    <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-full">{playlist.category || 'Uncategorized'}</span>
                                                </div>
                                                <p className="text-gray-500 text-sm mb-4 line-clamp-2 min-h-[1.25rem]">{playlist.description || 'Synced from YouTube'}</p>
                                                <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                                                    <span>{playlist.videoCount} videos</span>
                                                    <a href={`https://youtube.com/playlist?list=${playlist.id}`} target="_blank" className="flex items-center gap-1 text-blue-500 hover:underline">View on YT <ChevronRight className="w-4 h-4" /></a>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </div>
    )
}
