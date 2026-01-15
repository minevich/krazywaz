'use client'

import { useState } from 'react'
import { X, Link2, Check, AlertCircle } from 'lucide-react'

interface DetectedLink {
    platform: string
    url: string
    icon: string
}

interface BulkLinkImporterProps {
    isOpen: boolean
    onClose: () => void
    onApply: (links: Record<string, string>) => void
    currentLinks?: Record<string, string>
}

// Platform detection patterns
const platformPatterns: Record<string, { pattern: RegExp; icon: string; label: string }> = {
    youtube: {
        pattern: /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/i,
        icon: '▶️',
        label: 'YouTube'
    },
    youtubeMusic: {
        pattern: /music\.youtube\.com/i,
        icon: '🎵',
        label: 'YouTube Music'
    },
    spotify: {
        pattern: /open\.spotify\.com/i,
        icon: '🟢',
        label: 'Spotify'
    },
    apple: {
        pattern: /podcasts\.apple\.com|music\.apple\.com/i,
        icon: '🍎',
        label: 'Apple Podcasts'
    },
    amazon: {
        pattern: /music\.amazon\.com|amazon\.com\/music/i,
        icon: '📦',
        label: 'Amazon Music'
    },
    pocket: {
        pattern: /pocketcasts\.com/i,
        icon: '📱',
        label: 'Pocket Casts'
    },
    twentyFourSix: {
        pattern: /24six\.com|torahany/i,
        icon: '🎧',
        label: '24Six'
    },
    castbox: {
        pattern: /castbox\.fm/i,
        icon: '📻',
        label: 'Castbox'
    },
}

function detectPlatform(url: string): DetectedLink | null {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return null

    for (const [platform, config] of Object.entries(platformPatterns)) {
        if (config.pattern.test(trimmedUrl)) {
            return {
                platform,
                url: trimmedUrl,
                icon: config.icon,
            }
        }
    }
    return null
}

export default function BulkLinkImporter({ isOpen, onClose, onApply, currentLinks }: BulkLinkImporterProps) {
    const [inputValue, setInputValue] = useState('')
    const [detectedLinks, setDetectedLinks] = useState<DetectedLink[]>([])
    const [unrecognizedLinks, setUnrecognizedLinks] = useState<string[]>([])

    const handleDetect = () => {
        const lines = inputValue.split('\n').filter(line => line.trim())
        const detected: DetectedLink[] = []
        const unrecognized: string[] = []

        for (const line of lines) {
            const result = detectPlatform(line)
            if (result) {
                // Only add if not already detected for this platform
                if (!detected.find(d => d.platform === result.platform)) {
                    detected.push(result)
                }
            } else if (line.trim().startsWith('http')) {
                unrecognized.push(line.trim())
            }
        }

        setDetectedLinks(detected)
        setUnrecognizedLinks(unrecognized)
    }

    const handleApply = () => {
        const links: Record<string, string> = {}
        for (const link of detectedLinks) {
            links[link.platform] = link.url
        }
        onApply(links)
        handleClose()
    }

    const handleClose = () => {
        setInputValue('')
        setDetectedLinks([])
        setUnrecognizedLinks([])
        onClose()
    }

    const removeDetectedLink = (platform: string) => {
        setDetectedLinks(prev => prev.filter(l => l.platform !== platform))
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">Bulk Platform Link Importer</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Input Area */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Paste your links (one per line)
                        </label>
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={`https://youtube.com/watch?v=abc123
https://open.spotify.com/episode/xyz789
https://podcasts.apple.com/podcast/...
https://music.amazon.com/podcasts/...`}
                            className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm"
                        />
                        <button
                            onClick={handleDetect}
                            disabled={!inputValue.trim()}
                            className="mt-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            🔍 Detect Platforms
                        </button>
                    </div>

                    {/* Detected Links */}
                    {detectedLinks.length > 0 && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Check className="w-5 h-5 text-green-600" />
                                <h3 className="font-medium text-green-800">
                                    Detected {detectedLinks.length} platform{detectedLinks.length !== 1 ? 's' : ''}
                                </h3>
                            </div>
                            <div className="space-y-2">
                                {detectedLinks.map((link) => (
                                    <div
                                        key={link.platform}
                                        className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-200"
                                    >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className="text-lg">{link.icon}</span>
                                            <span className="font-medium text-sm">
                                                {platformPatterns[link.platform]?.label}
                                            </span>
                                            <span className="text-xs text-gray-500 truncate flex-1">
                                                {link.url}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => removeDetectedLink(link.platform)}
                                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Unrecognized Links Warning */}
                    {unrecognizedLinks.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="w-5 h-5 text-yellow-600" />
                                <h3 className="font-medium text-yellow-800">
                                    {unrecognizedLinks.length} unrecognized link{unrecognizedLinks.length !== 1 ? 's' : ''}
                                </h3>
                            </div>
                            <p className="text-sm text-yellow-700">
                                These URLs weren't recognized as any supported platform:
                            </p>
                            <ul className="mt-2 space-y-1">
                                {unrecognizedLinks.map((url, i) => (
                                    <li key={i} className="text-xs text-yellow-600 truncate font-mono">
                                        {url}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={detectedLinks.length === 0}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ✓ Apply {detectedLinks.length} Link{detectedLinks.length !== 1 ? 's' : ''}
                    </button>
                </div>
            </div>
        </div>
    )
}
