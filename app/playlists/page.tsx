'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import PlaylistBookViewer from '@/components/PlaylistBookViewer'

export default function PlaylistsPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)' }}>
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-white mb-4">
            Torah Playlists
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto">
            Explore shiurim arranged by Sefer and Parsha.
          </p>
        </div>

        <PlaylistBookViewer />
      </main>
      <Footer />
    </div>
  )
}
