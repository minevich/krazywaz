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

    const skip = (seconds: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.min(
                Math.max(0, audioRef.current.currentTime + seconds),
                duration || audioRef.current.duration || 999999
            )
        }
    }

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current
        if (!audio) return
        const newTime = parseFloat(e.target.value)
        audio.currentTime = newTime
        setCurrentTime(newTime)
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
                    className="fixed bottom-4 right-4 z-50 bg-white/95 backdrop-blur text-blue-600 px-3 py-2 rounded-full shadow-lg border border-gray-100 hover:scale-105 transition-transform flex items-center gap-2 font-medium text-xs group"
                >
                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        {isPlaying ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" className="ml-0.5" />}
                    </div>
                    <span>Resume</span>
                </button>
            </>
        )
    }

    return (
        <>
            <audio ref={audioRef} src={shiur.audioUrl} preload="metadata" />
            <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
                {/* Floating Island Design on Desktop, Full Width on Mobile */}
                <div className="mx-auto max-w-3xl md:mb-6 pointer-events-auto">
                    {/* Padding Adjust: py-3 on mobile (was py-2, increased slightly) */}
                    <div className="bg-white/95 backdrop-blur-md md:rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-t md:border border-gray-200/50 px-4 py-3 md:p-4 safe-area-pb relative">

                        {/* Elegant Hide Button with Text */}
                        <div className="absolute top-1 right-4 z-20">
                            <button
                                onClick={() => setIsMinimized(true)}
                                className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-gray-400 hover:text-blue-600 transition-colors uppercase py-1 px-2 rounded-full hover:bg-gray-50/50"
                                title="Collapse Player"
                            >
                                <span>Hide</span>
                                <ChevronDown size={12} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-2 pt-3 md:pt-2"> {/* pt-3 mobile to balance */}
                            <div className="flex items-center justify-between gap-4">

                                {/* Controls Group */}
                                <div className="flex items-center gap-3 md:gap-6 mx-auto md:mx-0">
                                    {/* Rewind 30s - Fixed Handler */}
                                    <button
                                        onClick={() => skip(-30)}
                                        className="text-gray-400 hover:text-blue-600 transition-colors flex flex-col items-center gap-0.5 group p-2"
                                        title="Rewind 30s"
                                    >
                                        <RotateCcw size={18} strokeWidth={1.5} />
                                        <span className="text-[10px] font-medium group-hover:text-blue-600">30</span>
                                    </button>

                                    {/* Play button */}
                                    <button
                                        onClick={togglePlay}
                                        className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-600/30"
                                    >
                                        {isPlaying ? (
                                            <Pause size={20} fill="currentColor" />
                                        ) : (
                                            <Play size={20} fill="currentColor" className="ml-1" />
                                        )}
                                    </button>

                                    {/* Forward 30s - Fixed Handler */}
                                    <button
                                        onClick={() => skip(30)}
                                        className="text-gray-400 hover:text-blue-600 transition-colors flex flex-col items-center gap-0.5 group p-2"
                                        title="Forward 30s"
                                    >
                                        <RotateCw size={18} strokeWidth={1.5} />
                                        <span className="text-[10px] font-medium group-hover:text-blue-600">30</span>
                                    </button>
                                </div>

                                {/* Desktop: Time & Speed on right */}
                                <div className="hidden md:flex items-center gap-4 flex-1">
                                    <span className="text-xs text-gray-500 font-medium w-10 text-right tabular-nums">{formatTime(currentTime)}</span>

                                    {/* Progress Bar - Blue 600 */}
                                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden relative group cursor-pointer">
                                        <input
                                            type="range"
                                            min="0"
                                            max={duration || 100}
                                            value={currentTime}
                                            onChange={handleSeek}
                                            className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                                        />
                                        <div
                                            className="h-full bg-blue-600 rounded-full transition-all duration-100 relative"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>

                                    <span className="text-xs text-gray-500 font-medium w-10 tabular-nums">{formatTime(duration)}</span>

                                    {/* Speed */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                                            className="text-xs font-bold text-gray-500 hover:text-blue-600 hover:bg-gray-50 px-2 py-1 rounded transition-colors w-10 text-center"
                                        >
                                            {playbackRate}x
                                        </button>
                                        {showSpeedMenu && (
                                            <div className="absolute bottom-full right-0 mb-2 bg-white text-gray-800 rounded-xl shadow-xl border border-gray-100 overflow-hidden min-w-[3rem] text-center p-1">
                                                {SPEEDS.map((speed) => (
                                                    <button
                                                        key={speed}
                                                        onClick={() => {
                                                            setPlaybackRate(speed)
                                                            setShowSpeedMenu(false)
                                                        }}
                                                        className={`block w-full py-1.5 text-xs font-medium rounded-lg transition-colors ${playbackRate === speed ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-600'
                                                            }`}
                                                    >
                                                        {speed}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Only: Progress Bar & Time */}
                            <div className="md:hidden flex items-center gap-3">
                                <span className="text-[10px] text-gray-400 font-medium w-8 text-right tabular-nums">{formatTime(currentTime)}</span>
                                {/* Timeline container needs explicit height for hit area? Range input handles it. */}
                                <div className="flex-1 h-1 bg-gray-100 rounded-full relative">
                                    <input
                                        type="range"
                                        min="0"
                                        max={duration || 100}
                                        value={currentTime}
                                        onChange={handleSeek}
                                        // Increased touch target with h-4 and negative margin, centered
                                        className="absolute top-1/2 -translate-y-1/2 -left-0 w-full h-6 opacity-0 z-20 cursor-pointer"
                                    />
                                    <div
                                        className="h-full bg-blue-600 rounded-full transition-all duration-100"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-gray-400 font-medium w-8 tabular-nums">{formatTime(duration)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
