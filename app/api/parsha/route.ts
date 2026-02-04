import { NextResponse } from 'next/server'
import { normalizeParsha } from '@/lib/parsha-utils'

interface HebcalItem {
    title: string
    date: string
    category: string
    hebrew?: string
    memo?: string
}

interface HebcalResponse {
    title: string
    date: string
    location: {
        city: string
    }
    items: HebcalItem[]
}

export async function GET() {
    try {
        // Fetch from Hebcal API - using Miami Beach coordinates
        const response = await fetch(
            'https://www.hebcal.com/shabbat?cfg=json&geonameid=4164138&M=on',
            { next: { revalidate: 3600 } } // Cache for 1 hour
        )

        if (!response.ok) {
            throw new Error('Failed to fetch from Hebcal')
        }

        const data: HebcalResponse = await response.json()

        // Find the parsha item
        const parshaItem = data.items.find(item => item.category === 'parashat')

        if (!parshaItem) {
            return NextResponse.json(
                { error: 'No parsha found for this week' },
                { status: 404 }
            )
        }

        // Extract parsha name (remove "Parashat " prefix)
        const rawParsha = parshaItem.title.replace(/^Parashat\s+/, '')
        const normalizedParsha = normalizeParsha(rawParsha)

        // Find candle lighting time
        const candleLighting = data.items.find(item => item.category === 'candles')

        return NextResponse.json({
            parsha: normalizedParsha,
            parshaRaw: rawParsha,
            parshaHebrew: parshaItem.hebrew || '',
            shabbosDate: parshaItem.date,
            candleLighting: candleLighting?.title || null,
            candleLightingTime: candleLighting?.date || null,
        })
    } catch (error) {
        console.error('Error fetching parsha:', error)
        return NextResponse.json(
            { error: 'Failed to fetch parsha information' },
            { status: 500 }
        )
    }
}
