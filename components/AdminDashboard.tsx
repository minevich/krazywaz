'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Edit, Trash2, RefreshCw, LogOut, FileText, Search, Filter, X } from 'lucide-react'
import ShiurForm from './ShiurForm'
import { useToast } from './Toast'
import AdminStats from './AdminStats'

interface Shiur {
  id: string
  guid: string
  title: string
  description?: string | null
  blurb?: string | null
  audioUrl: string
  sourceDoc?: string | null
  sourcesJson?: string | null
  pubDate: string
  duration?: string | null
  link?: string | null
  status?: 'draft' | 'published' | 'scheduled' | null
  platformLinks?: {
    youtube?: string | null
    youtubeMusic?: string | null
    spotify?: string | null
    apple?: string | null
    amazon?: string | null
    pocket?: string | null
    twentyFourSix?: string | null
    castbox?: string | null
  } | null
}

export default function AdminDashboard() {
  const [shiurim, setShiurim] = useState<Shiur[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [editingShiur, setEditingShiur] = useState<Shiur | null>(null)
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()
  const toast = useToast()

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'year'>('all')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'has-sources' | 'no-sources'>('all')

  // Filter shiurim based on search and filters
  const filteredShiurim = shiurim.filter(shiur => {
    // Text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesTitle = shiur.title.toLowerCase().includes(query)
      const matchesDesc = shiur.description?.toLowerCase().includes(query)
      const matchesBlurb = shiur.blurb?.toLowerCase().includes(query)
      if (!matchesTitle && !matchesDesc && !matchesBlurb) return false
    }

    // Date filter
    if (dateFilter !== 'all') {
      const pubDate = new Date(shiur.pubDate)
      const now = new Date()
      const daysDiff = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24)
      if (dateFilter === 'week' && daysDiff > 7) return false
      if (dateFilter === 'month' && daysDiff > 30) return false
      if (dateFilter === 'year' && daysDiff > 365) return false
    }

    // Source filter
    if (sourceFilter !== 'all') {
      const hasSources = !!(shiur.sourcesJson || shiur.sourceDoc)
      if (sourceFilter === 'has-sources' && !hasSources) return false
      if (sourceFilter === 'no-sources' && hasSources) return false
    }

    return true
  })

  const clearFilters = () => {
    setSearchQuery('')
    setDateFilter('all')
    setSourceFilter('all')
  }

  const hasActiveFilters = searchQuery || dateFilter !== 'all' || sourceFilter !== 'all'

  // Compute stats for AdminStats component
  const stats = {
    totalShiurim: shiurim.length,
    thisMonthCount: shiurim.filter(s => {
      const pubDate = new Date(s.pubDate)
      const now = new Date()
      return pubDate.getMonth() === now.getMonth() && pubDate.getFullYear() === now.getFullYear()
    }).length,
    withSources: shiurim.filter(s => s.sourcesJson || s.sourceDoc).length,
    missingLinks: shiurim.filter(s => {
      const links = s.platformLinks
      if (!links) return true
      const filledCount = [links.youtube, links.spotify, links.apple, links.amazon].filter(Boolean).length
      return filledCount < 2 // Consider "missing" if less than 2 main platforms
    }).length,
    drafts: shiurim.filter(s => s.status === 'draft').length
  }

  // Helper to count platform links for a shiur
  const getPlatformLinkCount = (shiur: Shiur) => {
    const links = shiur.platformLinks
    if (!links) return 0
    return [
      links.youtube,
      links.youtubeMusic,
      links.spotify,
      links.apple,
      links.amazon,
      links.pocket,
      links.twentyFourSix,
      links.castbox
    ].filter(Boolean).length
  }

  useEffect(() => {
    fetchShiurim()
  }, [])

  const fetchShiurim = async () => {
    try {
      const response = await fetch('/api/shiurim')
      const data = await response.json() as Shiur[]
      setShiurim(data)
    } catch (error) {
      console.error('Error fetching shiurim:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/rss/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await response.json() as { synced?: number; errors?: number; error?: string }

      if (response.ok) {
        toast.success(`Synced ${data.synced} shiurim`, data.errors ? `${data.errors} errors` : undefined)
        fetchShiurim()
      } else {
        toast.error('Error syncing RSS feed', data.error)
      }
    } catch (error) {
      toast.error('Error syncing RSS feed')
    } finally {
      setSyncing(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shiur?')) return

    try {
      const response = await fetch(`/api/shiurim/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Shiur deleted')
        fetchShiurim()
      } else {
        toast.error('Error deleting shiur')
      }
    } catch (error) {
      toast.error('Error deleting shiur')
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/login', { method: 'DELETE' })
      router.push('/admin')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleDeleteSourceSheet = async (shiurId: string, type: 'clipped' | 'pdf' = 'clipped') => {
    try {
      const body = type === 'clipped'
        ? { sourcesJson: null }
        : { sourceDoc: null }

      const response = await fetch(`/api/shiurim/${shiurId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        toast.success(type === 'clipped' ? 'Clipped sources deleted' : 'PDF link removed')
        fetchShiurim()
      } else {
        toast.error('Error deleting')
      }
    } catch (error) {
      toast.error('Error deleting')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/sources"
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              <FileText className="w-4 h-4" />
              Source Manager
            </Link>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync RSS'}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard Stats */}
        <AdminStats
          totalShiurim={stats.totalShiurim}
          thisMonthCount={stats.thisMonthCount}
          withSources={stats.withSources}
          missingLinks={stats.missingLinks}
          drafts={stats.drafts}
        />

        {/* Search and Filters */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search shiurim..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
            >
              <option value="all">All Time</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>

            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
            >
              <option value="all">All Sources</option>
              <option value="has-sources">Has Sources</option>
              <option value="no-sources">Missing Sources</option>
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {hasActiveFilters
              ? `Showing ${filteredShiurim.length} of ${shiurim.length} Shiurim`
              : `All Shiurim (${shiurim.length})`
            }
          </h2>
          <button
            onClick={() => {
              setEditingShiur(null)
              setShowForm(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New Shiur
          </button>
        </div>

        {showForm && (
          <div className="mb-8">
            <ShiurForm
              shiur={editingShiur}
              onSuccess={() => {
                setShowForm(false)
                setEditingShiur(null)
                fetchShiurim()
              }}
              onCancel={() => {
                setShowForm(false)
                setEditingShiur(null)
              }}
            />
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source Sheet
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Links
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredShiurim.map((shiur) => (
                  <React.Fragment key={shiur.id}>
                    <tr className="hover:bg-gray-50 group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-gray-900 max-w-md truncate">
                            {shiur.title}
                          </div>
                          {/* Hover Edit Button */}
                          <button
                            onClick={() => {
                              setEditingShiur(shiur)
                              setShowForm(true)
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary hover:bg-primary/10 rounded transition-all"
                            title="Quick Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(shiur.pubDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {shiur.duration || 'N/A'}
                      </td>
                      {/* Source Sheet Status */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Clipped Sources */}
                          {shiur.sourcesJson && (
                            <div className="flex items-center gap-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                📜 Clipped
                              </span>
                              <button
                                onClick={() => {
                                  if (confirm('Delete the clipped sources?')) {
                                    handleDeleteSourceSheet(shiur.id, 'clipped')
                                  }
                                }}
                                className="text-red-400 hover:text-red-600 p-0.5"
                                title="Delete clipped sources"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          {/* PDF URL */}
                          {shiur.sourceDoc && !shiur.sourceDoc.startsWith('sources:') && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              📄 PDF
                            </span>
                          )}
                          {/* None */}
                          {!shiur.sourcesJson && !shiur.sourceDoc && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                              None
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Platform Links Progress */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {(() => {
                          const count = getPlatformLinkCount(shiur)
                          const percentage = Math.round((count / 8) * 100)
                          const color = count >= 6 ? 'bg-green-500' : count >= 3 ? 'bg-yellow-500' : 'bg-red-400'
                          return (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${color} transition-all`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 font-medium w-8">
                                {count}/8
                              </span>
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/sources?shiurId=${shiur.id}`}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit Sources"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => {
                              setEditingShiur(shiur)
                              setShowForm(true)
                            }}
                            className="text-primary hover:text-primary/80"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(shiur.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Inline Edit Form - shows below the selected row */}
                    {editingShiur?.id === shiur.id && showForm && (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 bg-gray-50 border-t-2 border-primary">
                          <ShiurForm
                            shiur={editingShiur}
                            onSuccess={() => {
                              setShowForm(false)
                              setEditingShiur(null)
                              fetchShiurim()
                            }}
                            onCancel={() => {
                              setShowForm(false)
                              setEditingShiur(null)
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div >
  )
}

