'use client'

import { useState, useRef, useEffect } from 'react'

interface StickyAudioPlayerProps {
    shiur: {
        title: string
        audioUrl: string
        duration?: string | null
    }
}

export default function StickyAudioPlayer({ shiur }: StickyAudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [isMinimized, setIsMinimized] = useState(false)
    const audioRef = useRef<HTMLAudioElement>(null)

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const updateTime = () => setCurrentTime(audio.currentTime)
        const updateDuration = () => setDuration(audio.duration)
        const handleEnded = () => setIsPlaying(false)

        audio.addEventListener('timeupdate', updateTime)
        audio.addEventListener('loadedmetadata', updateDuration)
        audio.addEventListener('ended', handleEnded)

        return () => {
            audio.removeEventListener('timeupdate', updateTime)
            audio.removeEventListener('loadedmetadata', updateDuration)
            audio.removeEventListener('ended', handleEnded)
        }
    }, [])

    const togglePlay = () => {
        const audio = audioRef.current
        if (!audio) return

        if (isPlaying) {
            audio.pause()
        } else {
            audio.play()
        }
        setIsPlaying(!isPlaying)
    }

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current
        if (!audio) return
        audio.currentTime = parseFloat(e.target.value)
        setCurrentTime(audio.currentTime)
    }

    const formatTime = (time: number) => {
        if (isNaN(time)) return '0:00'
        const minutes = Math.floor(time / 60)
        const seconds = Math.floor(time % 60)
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0

    if (isMinimized) {
        return (
            <>
                <audio ref={audioRef} src={shiur.audioUrl} preload="metadata" />
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary text-white">
                    <button
                        onClick={() => setIsMinimized(false)}
                        className="w-full py-2 flex items-center justify-center gap-2 text-sm hover:bg-primary/90 transition-colors"
                    >
                        <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                        <span className="truncate max-w-[200px]">{shiur.title}</span>
                        <i className="fas fa-chevron-up ml-2"></i>
                    </button>
                    {/* Progress bar when minimized */}
                    <div className="h-1 bg-white/20">
                        <div
                            className="h-full bg-white transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <audio ref={audioRef} src={shiur.audioUrl} preload="metadata" />
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary text-white shadow-2xl">
                {/* Minimize Button */}
                <button
                    onClick={() => setIsMinimized(true)}
                    className="absolute -top-8 right-4 bg-primary text-white px-3 py-1 rounded-t-lg text-xs hover:bg-primary/90 transition-colors flex items-center gap-1"
                >
                    <i className="fas fa-chevron-down"></i>
                    Hide
                </button>

                <div className="max-w-5xl mx-auto px-4 py-3">
                    {/* Title */}
                    <div className="text-center mb-2">
                        <p className="text-sm font-medium truncate">{shiur.title}</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-2">
                        <input
                            type="range"
                            min="0"
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                            style={{
                                background: `linear-gradient(to right, white ${progress}%, rgba(255,255,255,0.2) ${progress}%)`
                            }}
                        />
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs opacity-80 w-16">{formatTime(currentTime)}</span>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => {
                                    if (audioRef.current) {
                                        audioRef.current.currentTime = Math.max(0, currentTime - 15)
                                    }
                                }}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                title="Rewind 15s"
                            >
                                <i className="fas fa-backward text-lg"></i>
                            </button>

                            <button
                                onClick={togglePlay}
                                className="w-12 h-12 bg-white text-primary rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
                            >
                                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-xl ${!isPlaying ? 'ml-1' : ''}`}></i>
                            </button>

                            <button
                                onClick={() => {
                                    if (audioRef.current) {
                                        audioRef.current.currentTime = Math.min(duration, currentTime + 15)
                                    }
                                }}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                title="Forward 15s"
                            >
                                <i className="fas fa-forward text-lg"></i>
                            </button>
                        </div>

                        <span className="text-xs opacity-80 w-16 text-right">{formatTime(duration)}</span>
                    </div>
                </div>
            </div>
        </>
    )
}
