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
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50 group-focus-within:text-white transition-colors" />
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
                    className="w-full pl-12 pr-12 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/20 focus:border-white/30 transition-all shadow-lg shadow-black/10 text-base"
                />
                {query && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <X className="w-5 h-5" />
                        )}
                    </button>
                )}
            </div>

            {/* Results Dropdown */}
            {isOpen && query.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl shadow-black/20 border border-gray-100 overflow-hidden z-50 max-h-[70vh] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    {isLoading && results.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                            <p className="text-gray-500 font-medium">Searching...</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                                <Search className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-gray-500 font-medium">No shiurim found</p>
                            <p className="text-gray-400 text-sm mt-1">Try a different search term</p>
                        </div>
                    ) : (
                        <>
                            {/* Results Header */}
                            <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    {results.length} result{results.length !== 1 ? 's' : ''} found
                                </p>
                            </div>

                            {/* Results List */}
                            <ul className="divide-y divide-gray-100">
                                {results.map((result, index) => (
                                    <li key={result.id}>
                                        <Link
                                            href={getShiurUrl(result)}
                                            onClick={() => setIsOpen(false)}
                                            className={`block px-4 py-4 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all group/item ${index === selectedIndex ? 'bg-gradient-to-r from-primary/10 to-transparent' : ''
                                                }`}
                                        >
                                            <div className="flex gap-3">
                                                {/* Accent Line */}
                                                <div className={`w-1 rounded-full self-stretch transition-colors ${index === selectedIndex ? 'bg-primary' : 'bg-gray-200 group-hover/item:bg-primary/50'
                                                    }`} />

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div
                                                        className="font-semibold text-gray-900 line-clamp-1 group-hover/item:text-primary transition-colors"
                                                        dangerouslySetInnerHTML={{ __html: result.titleSnippet || result.title }}
                                                    />
                                                    {(result.descSnippet || result.blurb) && (
                                                        <div
                                                            className="text-sm text-gray-500 line-clamp-2 mt-1 leading-relaxed"
                                                            dangerouslySetInnerHTML={{ __html: result.descSnippet || result.blurb || '' }}
                                                        />
                                                    )}
                                                </div>

                                                {/* Arrow indicator */}
                                                <div className="flex items-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>

                            {/* Footer hint */}
                            <div className="px-4 py-2 bg-gray-50/80 border-t border-gray-100">
                                <p className="text-xs text-gray-400 text-center">
                                    Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600 font-mono text-[10px]">↑</kbd>
                                    <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600 font-mono text-[10px] ml-1">↓</kbd>
                                    <span className="mx-1">to navigate,</span>
                                    <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600 font-mono text-[10px]">Enter</kbd>
                                    <span className="ml-1">to select</span>
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
