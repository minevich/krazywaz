'use client'

import { useState } from 'react'
import { Play, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'

interface PlaylistCategoryProps {
    title: string
    playlists: any[]
}

export default function PlaylistCategory({ title, playlists }: PlaylistCategoryProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="space-y-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between group p-4 bg-white hover:bg-white/50 border border-gray-100 dark:border-gray-800 rounded-xl transition-all shadow-sm hover:shadow"
            >
                <h2 className="font-serif text-xl md:text-2xl font-bold text-primary group-hover:text-secondary transition-colors text-left flex items-center gap-3">
                    <div className={`p-1.5 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors ${isOpen ? 'rotate-180' : ''} duration-300`}>
                        <ChevronDown className="w-5 h-5 text-primary" />
                    </div>
                    {title}
                </h2>
                <span className="text-xs md:text-sm font-medium bg-primary/5 text-primary px-3 py-1 rounded-full group-hover:bg-primary/10 transition-colors border border-primary/10">
                    {playlists.length} {playlists.length === 1 ? 'Playlist' : 'Playlists'}
                </span>
            </button>

            <div
                className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-500 ease-in-out origin-top ${isOpen ? 'opacity-100 max-h-[5000px] scale-y-100 py-2' : 'max-h-0 scale-y-0 opacity-0 overflow-hidden'
                    }`}
            >
                {playlists.map((playlist: any) => (
                    <a
                        key={playlist.id}
                        href={`https://www.youtube.com/playlist?list=${playlist.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white rounded-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col h-full group/card"
                    >
                        <div className="relative aspect-video bg-gray-100 overflow-hidden">
                            {playlist.thumbnail ? (
                                <img
                                    src={playlist.thumbnail}
                                    alt={playlist.title}
                                    className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50/50">
                                    <Play className="w-12 h-12 text-gray-300" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                                <div className="opacity-0 group-hover/card:opacity-100 transition-all duration-300 transform scale-90 group-hover/card:scale-100 bg-white rounded-full p-4 shadow-xl">
                                    <Play className="w-5 h-5 text-primary fill-current ml-0.5" />
                                </div>
                            </div>
                            <div className="absolute bottom-3 right-3 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                                {playlist.videoCount} VIDEOS
                            </div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                            <h3 className="font-serif text-lg font-semibold text-primary mb-2 line-clamp-2 group-hover/card:text-secondary transition-colors leading-tight">
                                {playlist.title}
                            </h3>
                            {playlist.description && (
                                <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1 font-light leading-relaxed">
                                    {playlist.description}
                                </p>
                            )}
                            <div className="flex items-center justify-between pt-4 mt-auto border-t border-gray-50">
                                <span className="text-xs text-primary font-medium flex items-center gap-1.5 group-hover/card:text-secondary transition-colors bg-primary/5 px-2.5 py-1 rounded-full">
                                    View Playlist
                                    <ExternalLink className="w-3 h-3" />
                                </span>
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    )
}
