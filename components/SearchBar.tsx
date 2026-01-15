'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Search, X, Loader2 } from 'lucide-react'
import { getShiurUrl } from '@/lib/utils'

interface SearchResult {
    id: string
    title: string
    slug: string | null
    blurb: string | null
    description: string | null
    pubDate: number
    duration: string | null
    audioUrl: string
    rank: number
    titleSnippet: string
    descSnippet: string
}

interface SearchBarProps {
    className?: string
}

export default function SearchBar({ className = '' }: SearchBarProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)

    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<NodeJS.Timeout>()

    // Debounced search
    const search = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([])
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
            const data: { results?: SearchResult[] } = await res.json()
            setResults(data.results || [])
        } catch (error) {
            console.error('Search failed:', error)
            setResults([])
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Handle input change with debounce
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        if (query.length >= 2) {
            setIsLoading(true)
            debounceRef.current = setTimeout(() => {
                search(query)
            }, 300)
        } else {
            setResults([])
            setIsLoading(false)
        }

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current)
            }
        }
    }, [query, search])

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || results.length === 0) return

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
                break
            case 'ArrowUp':
                e.preventDefault()
                setSelectedIndex(prev => Math.max(prev - 1, -1))
                break
            case 'Enter':
                e.preventDefault()
                if (selectedIndex >= 0 && results[selectedIndex]) {
                    window.location.href = getShiurUrl(results[selectedIndex])
                }
                break
            case 'Escape':
                setIsOpen(false)
                inputRef.current?.blur()
                break
        }
    }

    const clearSearch = () => {
        setQuery('')
        setResults([])
        setIsOpen(false)
        inputRef.current?.focus()
    }

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Search Input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setIsOpen(true)
                        setSelectedIndex(-1)
                    }}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search shiurim..."
                    className="w-full pl-10 pr-10 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/20 transition-all"
                />
                {query && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <X className="w-4 h-4" />
                        )}
                    </button>
                )}
            </div>

            {/* Results Dropdown */}
            {isOpen && query.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
                    {isLoading && results.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                            Searching...
                        </div>
                    ) : results.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                            No shiurim found for "{query}"
                        </div>
                    ) : (
                        <ul>
                            {results.map((result, index) => (
                                <li key={result.id}>
                                    <Link
                                        href={getShiurUrl(result)}
                                        onClick={() => setIsOpen(false)}
                                        className={`block px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${index === selectedIndex ? 'bg-primary/5' : ''
                                            }`}
                                    >
                                        <div
                                            className="font-medium text-gray-900 line-clamp-1"
                                            dangerouslySetInnerHTML={{ __html: result.titleSnippet || result.title }}
                                        />
                                        {result.descSnippet && (
                                            <div
                                                className="text-sm text-gray-500 line-clamp-2 mt-1"
                                                dangerouslySetInnerHTML={{ __html: result.descSnippet }}
                                            />
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    )
}
