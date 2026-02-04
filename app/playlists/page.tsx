'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import PlaylistBookViewer from '@/components/PlaylistBookViewer'

export default function PlaylistsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <Header />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8 text-center md:text-left">
          <h1 className="font-serif text-3xl md:text-5xl font-bold text-primary mb-4">
            Torah Playlists
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Explore shiurim arranged by Sefer and Parsha.
          </p>
        </div>

        <PlaylistBookViewer />
      </main>
      <Footer />
    </div>
  )
}
