'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Music, Youtube } from 'lucide-react'
import { PLAYLIST_DATA, BookData } from '@/lib/playlist-data'
import { cn } from '@/lib/utils'

export default function PlaylistBookViewer() {
    // Setup state to track expanded books. Default to first book open?
    // Or maybe allow one open at a time.
    const [openBook, setOpenBook] = useState<string | null>('Bereishis')

    const toggleBook = (bookName: string) => {
        setOpenBook(openBook === bookName ? null : bookName)
    }

    return (
        <div className="max-w-3xl mx-auto space-y-4">
            {PLAYLIST_DATA.map((book) => (
                <div key={book.bookName} className="border border-white/10 rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm">
                    {/* Book Header (Clickable) */}
                    <button
                        onClick={() => toggleBook(book.bookName)}
                        className="w-full flex items-center justify-between p-4 md:p-6 text-left transition-colors hover:bg-white/5"
                    >
                        <h2 className="text-xl md:text-2xl font-serif font-bold text-blue-100 flex items-center gap-3">
                            <span className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-sm md:text-base border border-blue-400/30">
                                {book.bookName[0]}
                            </span>
                            {book.bookName}
                        </h2>
                        {openBook === book.bookName ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                    </button>

                    {/* Parsha List (Collapsible) */}
                    <div
                        className={cn(
                            "transition-all duration-300 ease-in-out border-t border-white/5 overflow-hidden",
                            openBook === book.bookName ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                        )}
                    >
                        <div className="divide-y divide-white/5">
                            {book.parshas.map((parsha) => (
                                <div key={parsha.name} className="flex items-center justify-between p-4 pl-6 md:pl-16 hover:bg-white/5 transition-colors group">
                                    <span className="text-base md:text-lg text-gray-200 font-medium tracking-wide">
                                        {parsha.name}
                                    </span>

                                    <div className="flex items-center gap-3 md:gap-4">
                                        {/* YouTube Link */}
                                        {parsha.youtube ? (
                                            <a
                                                href={parsha.youtube}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 bg-red-600/10 text-red-400 rounded-full hover:bg-red-600 hover:text-white transition-all transform hover:scale-110"
                                                title="Watch on YouTube"
                                            >
                                                <Youtube className="w-4 h-4 md:w-5 md:h-5" />
                                            </a>
                                        ) : (
                                            <span className="p-2 opacity-20"><Youtube className="w-4 h-4 md:w-5 md:h-5" /></span>
                                        )}

                                        {/* Spotify Link */}
                                        {parsha.spotify ? (
                                            <a
                                                href={parsha.spotify}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 bg-green-600/10 text-green-400 rounded-full hover:bg-green-600 hover:text-white transition-all transform hover:scale-110"
                                                title="Listen on Spotify"
                                            >
                                                <Music className="w-4 h-4 md:w-5 md:h-5" />
                                            </a>
                                        ) : (
                                            <span className="p-2 opacity-20"><Music className="w-4 h-4 md:w-5 md:h-5" /></span>
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
