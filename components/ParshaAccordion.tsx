'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown, BookOpen, Calendar, Clock, Loader2, Info } from 'lucide-react'
import { cn, formatDate, formatDuration, getShiurUrl } from '@/lib/utils'
import PlayButton from '@/components/PlayButton'
import ViewCounter from '@/components/ViewCounter'

interface Shiur {
    id: string
    title: string
    blurb?: string
    pubDate: string
    duration?: string
    audioUrl: string
    slug?: string | null
    platformLinks?: any
}

interface ParshaData {
    parsha: string
    parshaHebrew: string
    shabbosDate: string
}

interface ShiurimResponse {
    parsha: string
    count: number
    shiurim: Shiur[]
}

export default function ParshaAccordion() {
    const [isOpen, setIsOpen] = useState(false)
    const [parshaData, setParshaData] = useState<ParshaData | null>(null)
    const [shiurim, setShiurim] = useState<Shiur[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch current parsha
                const parshaRes = await fetch('/api/parsha')
                if (!parshaRes.ok) {
                    throw new Error('Failed to fetch parsha')
                }
                const parshaJson = await parshaRes.json() as ParshaData
                setParshaData(parshaJson)

                // Fetch shiurim for this parsha
                const shiurimRes = await fetch(`/api/shiurim/by-parsha?parsha=${encodeURIComponent(parshaJson.parsha)}`)
                if (shiurimRes.ok) {
                    const shiurimJson: ShiurimResponse = await shiurimRes.json()
                    setShiurim(shiurimJson.shiurim)
                }
            } catch (err: any) {
                console.error('Error loading parsha data:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-muted-foreground">Loading this week's parsha...</span>
                </div>
            </div>
        )
    }

    if (error || !parshaData) {
        return null // Silently fail - don't break the page
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Accordion Header */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between p-4 md:p-5 text-left transition-colors hover:bg-gray-50 group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-serif font-semibold text-primary">
                                This Week's Parsha
                                <span className="font-normal text-muted-foreground ml-2">
                                    ({parshaData.parsha})
                                </span>
                            </h2>
                            {parshaData.parshaHebrew && (
                                <p className="text-sm text-muted-foreground">{parshaData.parshaHebrew}</p>
                            )}
                        </div>
                    </div>
                    <ChevronDown
                        className={cn(
                            "w-5 h-5 text-muted-foreground transition-transform duration-300",
                            isOpen && "rotate-180"
                        )}
                    />
                </button>

                {/* Accordion Content */}
                <div
                    className={cn(
                        "transition-all duration-300 ease-in-out overflow-hidden border-t border-gray-100",
                        isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 border-t-0"
                    )}
                >
                    <div className="p-4 md:p-5">
                        {shiurim.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">
                                    No shiurim found for Parshas {parshaData.parsha} yet.
                                </p>
                                <Link
                                    href="/archive"
                                    className="text-secondary hover:underline text-sm mt-2 inline-block"
                                >
                                    Browse all shiurim →
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {shiurim.map((shiur) => (
                                    <div
                                        key={shiur.id}
                                        className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors border border-gray-100"
                                    >
                                        <h3 className="font-serif font-semibold text-primary line-clamp-2 mb-2">
                                            <Link href={getShiurUrl({ id: shiur.id, slug: shiur.slug ?? null })} className="hover:text-secondary transition-colors">
                                                {shiur.title}
                                            </Link>
                                        </h3>
                                        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                <span>{formatDate(shiur.pubDate)}</span>
                                            </div>
                                            {shiur.duration && (
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{formatDuration(shiur.duration)}</span>
                                                </div>
                                            )}
                                            <ViewCounter shiurId={shiur.id} showBreakdown={false} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <PlayButton shiur={shiur} />
                                            <Link
                                                href={getShiurUrl({ id: shiur.id, slug: shiur.slug ?? null })}
                                                className="flex items-center gap-1 text-xs text-secondary hover:text-primary font-medium"
                                            >
                                                Details <Info className="w-3 h-3" />
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
