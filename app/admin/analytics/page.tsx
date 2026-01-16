'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Download, Upload, TrendingUp, Eye, Youtube, Music, Apple, BarChart3, X } from 'lucide-react'
import { useToast } from '@/components/Toast'

interface ShiurAnalytics {
    id: string
    shiurId: string
    title: string
    pubDate: string
    websiteViews: number
    youtubeViews: number
    spotifyPlays: number
    applePlays: number
    amazonPlays: number
    otherPlays: number
    totalViews: number
}

interface AnalyticsSummary {
    totalViews: number
    totalWebsite: number
    totalYoutube: number
    totalSpotify: number
    totalApple: number
    totalAmazon: number
    shiurimCount: number
    lastYoutubeSync: string | null
}

export default function AdminAnalyticsPage() {
    const [analytics, setAnalytics] = useState<ShiurAnalytics[]>([])
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [sortBy, setSortBy] = useState<'total' | 'website' | 'youtube' | 'date'>('total')
    const [showImport, setShowImport] = useState(false)
    const [importPlatform, setImportPlatform] = useState<'spotify' | 'apple' | 'amazon'>('spotify')
    const [importing, setImporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const toast = useToast()

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const fetchAnalytics = async () => {
        try {
            const response = await fetch('/api/admin/analytics')
            const data = await response.json() as { analytics: ShiurAnalytics[], summary: AnalyticsSummary }
            setAnalytics(data.analytics || [])
            setSummary(data.summary || null)
        } catch (error) {
            toast.error('Failed to load analytics')
        } finally {
            setLoading(false)
        }
    }

    const handleYouTubeSync = async () => {
        setSyncing(true)
        try {
            const response = await fetch('/api/admin/analytics/youtube-sync', { method: 'POST' })
            const data = await response.json() as { success: boolean, synced: number, error?: string }
            if (data.success) {
                toast.success(`Synced ${data.synced} YouTube videos`)
                fetchAnalytics()
            } else {
                toast.error(data.error || 'Sync failed')
            }
        } catch (error) {
            toast.error('Failed to sync YouTube')
        } finally {
            setSyncing(false)
        }
    }

    const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setImporting(true)
        try {
            const text = await file.text()
            const lines = text.split('\n').map(line => line.trim()).filter(Boolean)

            // Parse CSV - Spotify format: Episode, Date, Type, Starts, Streams, Listeners, ...
            // We need: Column 0 (Episode name) and Column 4 (Streams)
            const data: { episodeName: string; plays: number }[] = []

            // Helper to parse CSV line properly (handles quoted fields)
            const parseCSVLine = (line: string): string[] => {
                const result: string[] = []
                let current = ''
                let inQuotes = false

                for (let i = 0; i < line.length; i++) {
                    const char = line[i]
                    if (char === '"') {
                        inQuotes = !inQuotes
                    } else if (char === ',' && !inQuotes) {
                        result.push(current.trim())
                        current = ''
                    } else {
                        current += char
                    }
                }
                result.push(current.trim())
                return result
            }

            for (let i = 1; i < lines.length; i++) { // Skip header
                const parts = parseCSVLine(lines[i])
                if (parts.length >= 5) {
                    const episodeName = parts[0].replace(/"/g, '').trim()
                    // Spotify: Streams is at index 4
                    const plays = parseInt(parts[4].replace(/"/g, '').replace(/,/g, '').trim(), 10) || 0
                    if (episodeName && plays > 0) {
                        data.push({ episodeName, plays })
                    }
                }
            }

            if (data.length === 0) {
                toast.error('No valid data found in CSV')
                return
            }

            const response = await fetch('/api/admin/analytics/import-csv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform: importPlatform, data }),
            })

            const result = await response.json() as { success: boolean, matched: number, unmatched: number, error?: string }

            if (result.success) {
                toast.success(`Imported ${result.matched} episodes`, `${result.unmatched} unmatched`)
                fetchAnalytics()
                setShowImport(false)
            } else {
                toast.error(result.error || 'Import failed')
            }
        } catch (error) {
            toast.error('Failed to parse CSV')
        } finally {
            setImporting(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const sortedAnalytics = [...analytics].sort((a, b) => {
        switch (sortBy) {
            case 'total': return b.totalViews - a.totalViews
            case 'website': return b.websiteViews - a.websiteViews
            case 'youtube': return b.youtubeViews - a.youtubeViews
            case 'date': return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
            default: return 0
        }
    })

    const formatNumber = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
        return num.toLocaleString()
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading analytics...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-2xl font-bold text-primary">Analytics Dashboard</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowImport(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <Upload className="w-4 h-4" />
                            Import CSV
                        </button>
                        <button
                            onClick={handleYouTubeSync}
                            disabled={syncing}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            <Youtube className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Syncing...' : 'Sync YouTube'}
                        </button>
                    </div>
                </div>
            </div>

            {/* CSV Import Modal */}
            {showImport && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Import Podcast Analytics</h2>
                            <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                                <select
                                    value={importPlatform}
                                    onChange={(e) => setImportPlatform(e.target.value as typeof importPlatform)}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    <option value="spotify">Spotify</option>
                                    <option value="apple">Apple Podcasts</option>
                                    <option value="amazon">Amazon Music</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">CSV File</label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleCSVUpload}
                                    disabled={importing}
                                    className="w-full px-3 py-2 border rounded-lg file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:bg-primary file:text-white file:cursor-pointer"
                                />
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                                <p className="font-medium mb-1">Expected CSV format:</p>
                                <code className="text-xs">Episode Name, ..., Plays</code>
                                <p className="mt-2 text-xs">Download from Spotify for Podcasters, Apple Podcast Connect, or Amazon for Podcasters.</p>
                            </div>
                        </div>

                        {importing && (
                            <div className="mt-4 flex items-center gap-2 text-primary">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Importing...
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Summary Cards */}
                {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                                <Eye className="w-4 h-4" />
                                Total Views
                            </div>
                            <div className="text-2xl font-bold text-primary">{formatNumber(summary.totalViews)}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                                <BarChart3 className="w-4 h-4" />
                                Website
                            </div>
                            <div className="text-2xl font-bold text-blue-600">{formatNumber(summary.totalWebsite)}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                                <Youtube className="w-4 h-4" />
                                YouTube
                            </div>
                            <div className="text-2xl font-bold text-red-600">{formatNumber(summary.totalYoutube)}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                                <Music className="w-4 h-4" />
                                Spotify
                            </div>
                            <div className="text-2xl font-bold text-green-600">{formatNumber(summary.totalSpotify)}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                                <Apple className="w-4 h-4" />
                                Apple
                            </div>
                            <div className="text-2xl font-bold text-gray-700">{formatNumber(summary.totalApple)}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                                Amazon
                            </div>
                            <div className="text-2xl font-bold text-orange-600">{formatNumber(summary.totalAmazon)}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                                <TrendingUp className="w-4 h-4" />
                                Shiurim
                            </div>
                            <div className="text-2xl font-bold text-purple-600">{summary.shiurimCount}</div>
                        </div>
                    </div>
                )}

                {/* Sort Controls */}
                <div className="flex items-center gap-4 mb-4">
                    <span className="text-sm text-gray-500">Sort by:</span>
                    <div className="flex gap-2">
                        {[
                            { key: 'total', label: 'Total Views' },
                            { key: 'website', label: 'Website' },
                            { key: 'youtube', label: 'YouTube' },
                            { key: 'date', label: 'Date' },
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setSortBy(key as typeof sortBy)}
                                className={`px-3 py-1 text-sm rounded-full transition-colors ${sortBy === key
                                    ? 'bg-primary text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Analytics Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Shiur
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Website
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        YouTube
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Spotify
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Apple
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amazon
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Total
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {sortedAnalytics.map((item, index) => (
                                    <tr key={item.shiurId} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-gray-400 text-sm w-6">{index + 1}</span>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                                                        {item.title}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {new Date(item.pubDate).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center text-sm text-blue-600 font-medium">
                                            {formatNumber(item.websiteViews)}
                                        </td>
                                        <td className="px-4 py-4 text-center text-sm text-red-600 font-medium">
                                            {formatNumber(item.youtubeViews)}
                                        </td>
                                        <td className="px-4 py-4 text-center text-sm text-green-600 font-medium">
                                            {formatNumber(item.spotifyPlays)}
                                        </td>
                                        <td className="px-4 py-4 text-center text-sm text-gray-700 font-medium">
                                            {formatNumber(item.applePlays)}
                                        </td>
                                        <td className="px-4 py-4 text-center text-sm text-orange-600 font-medium">
                                            {formatNumber(item.amazonPlays)}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-sm font-bold text-primary">
                                                {formatNumber(item.totalViews)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {sortedAnalytics.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                            No analytics data yet. Views will appear after users visit shiur pages.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="mt-8 grid md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                        <h3 className="font-semibold text-blue-900 mb-2">📊 How Analytics Work</h3>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>• <strong>Website</strong> — Tracked automatically on page visits</li>
                            <li>• <strong>YouTube</strong> — Click "Sync YouTube" to update</li>
                            <li>• <strong>Spotify/Apple/Amazon</strong> — Use "Import CSV"</li>
                        </ul>
                    </div>
                    <div className="bg-green-50 rounded-xl p-6 border border-green-100">
                        <h3 className="font-semibold text-green-900 mb-2">🔗 OP3 Proxy for Future Tracking</h3>
                        <p className="text-sm text-green-800 mb-2">
                            For automatic podcast tracking, submit this RSS to platforms:
                        </p>
                        <code className="text-xs bg-green-100 px-2 py-1 rounded break-all block">
                            {typeof window !== 'undefined' ? window.location.origin : ''}/api/rss/op3-proxy
                        </code>
                    </div>
                </div>
            </div>
        </div>
    )
}

