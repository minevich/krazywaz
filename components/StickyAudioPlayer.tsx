'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, RotateCcw, RotateCw, ChevronUp, ChevronDown } from 'lucide-react'

interface StickyAudioPlayerProps {
    shiur: {
        title: string
        audioUrl: string
        duration?: string | null
    }
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

export default function StickyAudioPlayer({ shiur }: StickyAudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [isMinimized, setIsMinimized] = useState(false)
    const [playbackRate, setPlaybackRate] = useState(1)
    const [showSpeedMenu, setShowSpeedMenu] = useState(false)
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

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate
        }
    }, [playbackRate])

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
                <button
                    onClick={() => setIsMinimized(false)}
                    className="fixed bottom-0 right-4 z-50 bg-primary text-white px-4 py-3 rounded-t-xl text-sm hover:bg-primary/90 transition-colors flex items-center gap-3 shadow-lg font-medium"
                >
                    {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    <span>Player</span>
                    <ChevronUp size={16} />
                </button>
            </>
        )
    }

    return (
        <>
            <audio ref={audioRef} src={shiur.audioUrl} preload="metadata" />
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary text-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)] safe-area-pb transition-all duration-300">
                {/* Minimize Button */}
                <button
                    onClick={() => setIsMinimized(true)}
                    className="absolute -top-10 right-4 bg-primary text-white px-4 py-2 rounded-t-xl text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-md"
                >
                    <ChevronDown size={14} />
                    Hide
                </button>

                <div className="max-w-4xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-6">
                        {/* Rewind 30s */}
                        <button
                            onClick={() => {
                                if (audioRef.current) {
                                    audioRef.current.currentTime = Math.max(0, currentTime - 30)
                                }
                            }}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors hidden sm:flex flex-col items-center justify-center gap-0.5 group text-white/90 hover:text-white"
                            title="Rewind 30s"
                        >
                            <RotateCcw size={20} strokeWidth={2.5} />
                            <span className="text-[10px] font-bold">30</span>
                        </button>

                        {/* Play button */}
                        <button
                            onClick={togglePlay}
                            className="w-14 h-14 bg-white text-primary rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl flex-shrink-0"
                        >
                            {isPlaying ? (
                                <Pause size={24} fill="currentColor" className="ml-0.5" />
                            ) : (
                                <Play size={24} fill="currentColor" className="ml-1" />
                            )}
                        </button>

                        {/* Forward 30s */}
                        <button
                            onClick={() => {
                                if (audioRef.current) {
                                    audioRef.current.currentTime = Math.min(duration, currentTime + 30)
                                }
                            }}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors hidden sm:flex flex-col items-center justify-center gap-0.5 group text-white/90 hover:text-white"
                            title="Forward 30s"
                        >
                            <RotateCw size={20} strokeWidth={2.5} />
                            <span className="text-[10px] font-bold">30</span>
                        </button>

                        {/* Time Control Group */}
                        <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0 px-2">
                            {/* Time Labels */}
                            <div className="flex justify-between text-xs font-medium text-white/80 px-0.5">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>

                            {/* Progress Bar */}
                            <div className="relative h-5 flex items-center group cursor-pointer w-full">
                                <input
                                    type="range"
                                    min="0"
                                    max={duration || 100}
                                    value={currentTime}
                                    onChange={handleSeek}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-white rounded-full transition-all duration-100"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                {/* Thumb Highlight */}
                                <div
                                    className="absolute h-3.5 w-3.5 bg-white rounded-full shadow-md transition-all duration-100 opacity-0 group-hover:opacity-100"
                                    style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
                                />
                            </div>
                        </div>

                        {/* Speed control */}
                        <div className="relative flex-shrink-0">
                            <button
                                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                                className="h-8 px-3 text-xs font-bold bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center min-w-[3.5rem]"
                            >
                                {playbackRate}x
                            </button>

                            {showSpeedMenu && (
                                <div className="absolute bottom-full right-0 mb-3 bg-white text-gray-800 rounded-xl shadow-xl overflow-hidden min-w-[100px] border border-gray-100 text-center py-1">
                                    {SPEEDS.map((speed) => (
                                        <button
                                            key={speed}
                                            onClick={() => {
                                                setPlaybackRate(speed)
                                                setShowSpeedMenu(false)
                                            }}
                                            className={`block w-full px-4 py-2 text-sm font-medium hover:bg-gray-50 transition-colors ${playbackRate === speed ? 'text-primary bg-primary/5' : 'text-gray-600'
                                                }`}
                                        >
                                            {speed}x
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
