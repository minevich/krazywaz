import Link from 'next/link'

export default function Header() {
  return (
    <header className="relative text-white text-center py-6 md:py-16 px-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)' }}>
      <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,...')] mix-blend-overlay"></div>
      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="w-16 h-16 md:w-32 md:h-32 mx-auto mb-3 md:mb-6 shadow-lg rounded-full overflow-hidden border-2 md:border-4 border-white/20 backdrop-blur-sm transition-all">
          <img
            src="https://raw.githubusercontent.com/rabbikraz/rabbikraz/main/Kraz%20Icon.png"
            alt="Rabbi Kraz"
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="font-serif text-2xl md:text-6xl font-bold mb-1 md:mb-4 tracking-tight leading-tight">
          <Link href="/">Rabbi Kraz's Shiurim</Link>
        </h1>
        <p className="hidden md:block text-lg md:text-xl text-blue-100 max-w-2xl mx-auto font-light">
          Timeless Torah wisdom, delivered with passion. Dive into weekly shiurim that illuminate the soul.
        </p>
        <div className="mt-4 md:mt-8 flex flex-wrap justify-center gap-2 md:gap-4">
          <Link
            className="px-4 py-1.5 md:px-6 md:py-2.5 text-xs md:text-base rounded-full font-medium shadow-lg hover:shadow-xl transition-all bg-white text-primary hover:-translate-y-0.5"
            href="/"
          >
            Home
          </Link>
          <Link
            className="px-4 py-1.5 md:px-6 md:py-2.5 text-xs md:text-base rounded-full font-medium shadow-lg hover:shadow-xl transition-all bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm hover:-translate-y-0.5"
            href="/playlists"
          >
            Playlists
          </Link>
          <Link
            className="px-4 py-1.5 md:px-6 md:py-2.5 text-xs md:text-base rounded-full font-medium shadow-lg hover:shadow-xl transition-all bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm hover:-translate-y-0.5"
            href="/archive"
          >
            All Shiurim
          </Link>
          <Link
            className="px-4 py-1.5 md:px-6 md:py-2.5 text-xs md:text-base rounded-full font-medium shadow-lg hover:shadow-xl transition-all bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm hover:-translate-y-0.5"
            href="/videos"
          >
            Videos
          </Link>
          <Link
            className="px-4 py-1.5 md:px-6 md:py-2.5 text-xs md:text-base bg-accent text-white rounded-full font-medium shadow-lg hover:shadow-xl hover:bg-accent/90 hover:-translate-y-0.5 transition-all"
            href="/sponsor"
          >
            Sponsor
          </Link>
        </div>
      </div>
    </header>
  )
}

