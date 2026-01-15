import Link from 'next/link'
import { formatDate, formatDuration, getShiurUrl } from '@/lib/utils'
import Header from '@/components/Header'
import PlayButton from '@/components/PlayButton'
import PlatformGrid from '@/components/PlatformGrid'
import { Calendar, Clock, Info } from 'lucide-react'
import { getDb, getD1Database } from '@/lib/db'
import { shiurim, platformLinks } from '@/lib/schema'
import { desc, eq } from 'drizzle-orm'

// Mark as dynamic to avoid build-time database access
export const dynamic = 'force-dynamic'
export const revalidate = 60 // Revalidate every 60 seconds

async function getLatestShiurim() {
  try {
    const d1 = await getD1Database()

    if (!d1) {
      console.error('D1 database not available')
      return []
    }

    const db = getDb(d1)

    // Fetch latest 9 shiurim directly from database
    const allShiurim = await db
      .select()
      .from(shiurim)
      .orderBy(desc(shiurim.pubDate))
      .limit(9)
      .all()

    // Fetch platform links for each shiur
    const shiurimWithLinks = await Promise.all(
      allShiurim.map(async (shiur) => {
        const links = await db
          .select()
          .from(platformLinks)
          .where(eq(platformLinks.shiurId, shiur.id))
          .get()

        return {
          ...shiur,
          platformLinks: links || null,
        }
      })
    )

    return shiurimWithLinks
  } catch (error) {
    console.error('Error fetching shiurim:', error)
    return []
  }
}

export default async function Home() {
  const latestShiurim = await getLatestShiurim()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-12">
        <section className="mb-16">
          <div className="text-center mb-10">
            <h2 className="font-serif text-3xl font-semibold text-primary mb-2">
              Listen Anywhere
            </h2>
            <p className="text-muted-foreground">Subscribe on your favorite platform</p>
          </div>
          <PlatformGrid />
        </section>

        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-serif text-3xl font-semibold text-primary">
              Latest Shiurim
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestShiurim.map((shiur: any) => (
              <div
                key={shiur.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden flex flex-col h-full group"
              >
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="font-serif text-xl font-semibold text-primary line-clamp-2 group-hover:text-secondary transition-colors">
                      <Link href={getShiurUrl(shiur)}>{shiur.title}</Link>
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(shiur.pubDate)}</span>
                    </div>
                    {shiur.duration && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDuration(shiur.duration)}</span>
                      </div>
                    )}
                  </div>
                  {shiur.blurb && (
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-1">
                      {shiur.blurb}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-4 mt-auto border-t border-gray-50">
                    <PlayButton shiur={shiur} />
                    <Link
                      className="flex items-center gap-1 text-sm text-secondary hover:text-primary font-medium"
                      href={getShiurUrl(shiur)}
                    >
                      Details <Info className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-2xl mx-auto text-center bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="font-serif text-2xl font-semibold text-primary mb-4">
            Join the WhatsApp Group
          </h2>
          <p className="text-gray-600 mb-6">
            Get the latest shiur updates, announcements, and live shiur links directly to your phone.
          </p>
          <a
            href="https://chat.whatsapp.com/BdUZM8mzvXuEpgS9MoGN9W"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-[#25D366] text-white rounded-full font-bold hover:bg-[#128C7E] transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-[#25D366] font-bold text-xs">
              WA
            </div>
            Join Group
          </a>
        </section>
      </main>
      <footer className="bg-primary text-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="opacity-80 mb-4">
            © {new Date().getFullYear()} Rabbi Kraz's Shiurim. All rights reserved.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-sm text-blue-200">
            <div className="flex gap-6">
              <Link className="hover:text-white transition-colors" href="/">
                Home
              </Link>
              <Link className="hover:text-white transition-colors" href="/playlists">
                Playlists
              </Link>
              <Link className="hover:text-white transition-colors" href="/sponsor">
                Sponsor
              </Link>
              <a className="hover:text-white transition-colors" href="mailto:rabbikraz1@gmail.com">
                Contact
              </a>
            </div>
            <a
              href="https://anchor.fm/s/d89491c4/podcast/rss"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="M4 11a9 9 0 0 1 9 9"></path>
                <path d="M4 4a16 16 0 0 1 16 16"></path>
                <circle cx="5" cy="19" r="1"></circle>
              </svg>
              RSS Feed
            </a>
            {/* Social Media Links */}
            <div className="flex items-center gap-1 ml-4 pl-4 border-l border-white/20">
              <span className="text-sm text-white/60 mr-2">Follow us:</span>
              <a
                href="https://www.instagram.com/rabbikraz/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="Instagram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@rabbi.kraz"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                title="TikTok"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
