import { NextRequest, NextResponse } from 'next/server'

/**
 * OP3 Proxy RSS Feed
 * 
 * This endpoint fetches your original RSS feed and rewrites all audio URLs
 * to include the OP3 tracking prefix. When podcast apps fetch audio through
 * these URLs, OP3 logs the download and provides analytics.
 * 
 * Usage:
 * 1. Submit THIS URL to podcast platforms instead of your Anchor URL
 * 2. Audio downloads will be tracked by OP3
 * 3. Query OP3 API for download stats
 * 
 * Original RSS: https://anchor.fm/s/d89491c4/podcast/rss
 * This endpoint: /api/rss/op3-proxy
 */

const ORIGINAL_RSS_URL = 'https://anchor.fm/s/d89491c4/podcast/rss'
const OP3_PREFIX = 'https://op3.dev/e'

export async function GET(request: NextRequest) {
    try {
        // Fetch the original RSS feed
        const response = await fetch(ORIGINAL_RSS_URL, {
            headers: {
                'User-Agent': 'RabbiKraz-OP3-Proxy/1.0',
            },
        })

        if (!response.ok) {
            return new NextResponse('Failed to fetch RSS feed', { status: 502 })
        }

        let rssContent = await response.text()

        // Find all audio URLs (typically in <enclosure> tags) and prefix them with OP3
        // Pattern: url="https://..." or url='https://...'
        rssContent = rssContent.replace(
            /(<enclosure[^>]+url=["'])(https?:\/\/[^"']+)(["'][^>]*>)/gi,
            (match, prefix, url, suffix) => {
                // Add OP3 prefix: https://op3.dev/e/original-url
                const op3Url = `${OP3_PREFIX}/${url.replace(/^https?:\/\//, '')}`
                return `${prefix}${op3Url}${suffix}`
            }
        )

        // Also handle <url> tags inside <enclosure> (some RSS formats)
        rssContent = rssContent.replace(
            /(<enclosure>[\s\S]*?<url>)(https?:\/\/[^<]+)(<\/url>)/gi,
            (match, prefix, url, suffix) => {
                const op3Url = `${OP3_PREFIX}/${url.replace(/^https?:\/\//, '')}`
                return `${prefix}${op3Url}${suffix}`
            }
        )

        // Return the modified RSS with proper content type
        return new NextResponse(rssContent, {
            status: 200,
            headers: {
                'Content-Type': 'application/rss+xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            },
        })

    } catch (error) {
        console.error('OP3 proxy error:', error)
        return new NextResponse('Error processing RSS feed', { status: 500 })
    }
}
