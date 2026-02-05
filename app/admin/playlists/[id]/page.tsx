'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Trash2, Plus, Search, X, GripVertical } from 'lucide-react'
import { useToast } from '@/components/Toast'

interface Shiur {
    id: string
    title: string
    pubDate: string
    duration?: string
}

interface Playlist {
    id: string
    title: string
    description?: string
    category?: string
    items: PlaylistItem[]
}

interface PlaylistItem {
    id: string
    shiurId: string
    title: string
    duration?: string
    date: string
    position: number
}

export default function PlaylistEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const toast = useToast()

    const [playlist, setPlaylist] = useState<Playlist | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)

    // Metadata form state
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState('')

    // Video Selection State
    const [availableShiurim, setAvailableShiurim] = useState<Shiur[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedShiurIds, setSelectedShiurIds] = useState<Set<string>>(new Set())
    const [loadingShiurim, setLoadingShiurim] = useState(false)

    useEffect(() => {
        fetchPlaylist()
    }, [id])

    const fetchPlaylist = async () => {
        try {
            const response = await fetch(`/api/admin/playlists/${id}`)
            if (!response.ok) throw new Error('Failed to fetch')

            const data = await response.json() as Playlist
            setPlaylist(data)
            setTitle(data.title)
            setDescription(data.description || '')
            setCategory(data.category || 'Series')
        } catch (error) {
            console.error('Error:', error)
            toast.error('Error loading playlist')
        } finally {
            setLoading(false)
        }
    }

    const handleSaveMetadata = async () => {
        setSaving(true)
        try {
            const response = await fetch(`/api/admin/playlists/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, category })
            })

            if (response.ok) {
                toast.success('Saved changes')
                fetchPlaylist() // Refresh
            } else {
                toast.error('Error saving')
            }
        } catch (error) {
            toast.error('Error saving')
        } finally {
            setSaving(false)
        }
    }

    const loadShiurim = async () => {
        if (availableShiurim.length > 0) return
        setLoadingShiurim(true)
        try {
            const response = await fetch('/api/shiurim')
            const data = await response.json() as any[]
            // Map to simplified Shiur interface
            const shiurim = data.map(s => ({
                id: s.id,
                title: s.title,
                pubDate: s.pubDate,
                duration: s.duration
            }))
            setAvailableShiurim(shiurim)
        } catch (error) {
            console.error('Error loading shiurim:', error)
        } finally {
            setLoadingShiurim(false)
        }
    }

    const handleAddVideos = async () => {
        if (selectedShiurIds.size === 0) return

        try {
            const response = await fetch(`/api/admin/playlists/${id}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shiurIds: Array.from(selectedShiurIds) })
            })

            if (response.ok) {
                toast.success(`Added ${selectedShiurIds.size} videos`)
                setShowAddModal(false)
                setSelectedShiurIds(new Set())
                fetchPlaylist()
            } else {
                toast.error('Failed to add videos')
            }
        } catch (error) {
            toast.error('Error adding videos')
        }
    }

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm('Remove this video from playlist?')) return;

        try {
            const response = await fetch(`/api/admin/playlists/${id}/items?itemId=${itemId}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                toast.success('Video removed')
                fetchPlaylist()
            } else {
                toast.error('Failed to remove')
            }
        } catch (error) {
            toast.error('Error removing video')
        }
    }

    const handleDeletePlaylist = async () => {
        if (!confirm('Are you sure you want to delete this ENTIRE playlist? This cannot be undone.')) return

        try {
            const response = await fetch(`/api/admin/playlists/${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                toast.success('Playlist deleted')
                router.push('/admin/playlists')
            } else {
                toast.error('Error deleting playlist')
            }
        } catch (error) {
            toast.error('Error deleting playlist')
        }
    }

    const filteredShiurim = availableShiurim.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) return <div className="p-8 text-center">Loading...</div>
    if (!playlist) return <div className="p-8 text-center">Playlist not found</div>

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/playlists" className="text-gray-500 hover:text-gray-900">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{playlist.title}</h1>
                            <p className="text-sm text-gray-500">{playlist.items.length} videos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleDeletePlaylist}
                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            title="Delete Playlist"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleSaveMetadata}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

                {/* Checkbox for Holidays vs Series vs Parsha */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Playlist Settings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                            >
                                <option value="Series">Series</option>
                                <option value="Holidays">Holidays</option>
                                <option value="Misc">Misc</option>
                                <option value="Parsha">Parsha</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                rows={2}
                            />
                        </div>
                    </div>
                </div>

                {/* Video List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-900">Videos ({playlist.items.length})</h2>
                        <button
                            onClick={() => {
                                setShowAddModal(true)
                                loadShiurim()
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700"
                        >
                            <Plus className="w-4 h-4" />
                            Add Videos
                        </button>
                    </div>

                    {playlist.items.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No videos in this playlist yet.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {playlist.items.map((item, index) => (
                                <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 group">
                                    <div className="text-gray-400 cursor-move">
                                        <GripVertical className="w-5 h-5" />
                                    </div>
                                    <div className="w-8 text-center text-gray-400 text-sm">{index + 1}</div>
                                    <div className="flex-1">
                                        <h3 className="font-medium text-gray-900">{item.title}</h3>
                                        <p className="text-xs text-gray-500">{new Date(item.date).toLocaleDateString()} • {item.duration || 'N/A'}</p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Videos Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-bold text-lg">Add Videos to Playlist</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 border-b bg-gray-50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search shiurim..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {loadingShiurim ? (
                                <div className="text-center py-8">Loading...</div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredShiurim.slice(0, 100).map(shiur => { // Limit to 100 results for perf
                                        const isSelected = selectedShiurIds.has(shiur.id)
                                        return (
                                            <div
                                                key={shiur.id}
                                                onClick={() => {
                                                    const newSet = new Set(selectedShiurIds)
                                                    if (isSelected) newSet.delete(shiur.id)
                                                    else newSet.add(shiur.id)
                                                    setSelectedShiurIds(newSet)
                                                }}
                                                className={`p-3 rounded-lg cursor-pointer flex items-center gap-3 transition-colors ${isSelected ? 'bg-primary/10 border-primary border' : 'hover:bg-gray-50 border border-transparent'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-white' : 'border-gray-300'
                                                    }`}>
                                                    {isSelected && <Plus className="w-3 h-3" />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm">{shiur.title}</div>
                                                    <div className="text-xs text-gray-500">{new Date(shiur.pubDate).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {filteredShiurim.length === 0 && (
                                        <div className="text-center py-8 text-gray-500">No videos found</div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t flex items-center justify-between bg-gray-50 rounded-b-xl">
                            <div className="text-sm text-gray-600">
                                {selectedShiurIds.size} videos selected
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddVideos}
                                    disabled={selectedShiurIds.size === 0}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Add Selected
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
