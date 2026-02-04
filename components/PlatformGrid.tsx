import Link from 'next/link'

const platforms = [
  {
    name: 'YouTube',
    url: 'https://www.youtube.com/channel/UCMrMvXraTLhAtpb0JZQOKhQ',
    icon: 'fab fa-youtube',
  },
  {
    name: 'YT Music',
    url: 'https://music.youtube.com/playlist?list=PLFjvIKKaTDH85ZHMy4LsIxVydbTSL8kbt',
    icon: 'custom-ytmusic',
    customSvg: (
      <svg viewBox="0 0 176 176" className="w-5 h-5 md:w-6 md:h-6">
        <circle className="fill-[#4a90e2] group-hover:fill-primary transition-colors" cx="88" cy="88" r="88" />
        <path fill="#ffffff" d="M88,46c23.1,0,42,18.8,42,42s-18.8,42-42,42s-42-18.8-42-42S64.9,46,88,46 M88,42
          c-25.4,0-46,20.6-46,46s20.6,46,46,46s46-20.6,46-46S113.4,42,88,42L88,42z"/>
        <polygon fill="#ffffff" points="72,111 111,87 72,65" />
      </svg>
    )
  },
  {
    name: 'Spotify',
    url: 'https://open.spotify.com/show/6ZbhpCYBCqSZGOgQb1BwFz',
    icon: 'fab fa-spotify',
  },
  {
    name: 'Apple',
    url: 'https://podcasts.apple.com/us/podcast/rabbi-krazs-shiurim/id1701685139',
    icon: 'fab fa-apple',
  },
  {
    name: 'Amazon',
    url: 'https://music.amazon.com/podcasts/f0e647ec-80d9-4224-961c-a7c1f9c52a1e/rabbi-krazs-shiurim',
    icon: 'fab fa-amazon',
  },
  {
    name: 'Pocket Casts',
    url: 'https://pca.st/74lg0vrl',
    icon: 'custom-pocket',
    customSvg: (
      <svg viewBox="0 0 32 32" className="w-5 h-5 md:w-6 md:h-6">
        <circle cx="16" cy="15" r="15" fill="white" />
        <path className="fill-[#4a90e2] group-hover:fill-primary transition-colors" fillRule="evenodd" clipRule="evenodd" d="M16 32c8.837 0 16-7.163 16-16S24.837 0 16 0 0 7.163 0 16s7.163 16 16 16Zm0-28.444C9.127 3.556 3.556 9.127 3.556 16c0 6.873 5.571 12.444 12.444 12.444v-3.11A9.333 9.333 0 1 1 25.333 16h3.111c0-6.874-5.571-12.445-12.444-12.445ZM8.533 16A7.467 7.467 0 0 0 16 23.467v-2.715A4.751 4.751 0 1 1 20.752 16h2.715a7.467 7.467 0 0 0-14.934 0Z" />
      </svg>
    )
  },
  {
    name: '24Six',
    url: 'https://24six.app/preview/podcast/collection/11014/rabbi-krazs-shiurim',
    icon: 'fas fa-mobile-alt',
  },
  {
    name: 'Castbox',
    url: 'https://castbox.fm/channel/Rabbi-Krazs-Shiurim-id5574479',
    icon: 'custom-castbox',
    customSvg: (
      <svg className="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <path className="fill-[#4a90e2] group-hover:fill-primary transition-colors" d="M396,512H116C51.93,512,0,460.07,0,396V116C0,51.93,51.93,0,116,0h280c64.07,0,116,51.93,116,116v280
          C512,460.07,460.07,512,396,512z"/>
        <g>
          <path fill="#ffffff" d="M284.36,172.15c-9.5,0-17.22,7.32-17.22,16.35v39.56c0,5-4.63,9.05-10.33,9.05
            c-5.71,0-10.34-4.05-10.34-9.05v-53.82c0-9.04-7.71-16.36-17.22-16.36c-9.51,0-17.22,7.32-17.22,16.36v43.14
            c0,4.99-4.63,9.05-10.34,9.05c-5.7,0-10.33-4.06-10.33-9.05v-15.63c0-9.03-7.72-16.35-17.22-16.35c-9.51,0-17.22,7.32-17.22,16.35
            v37.01c0,4.99-4.63,9.05-10.34,9.05c-5.7,0-10.33-4.06-10.33-9.05v-4.3c0-9.45-7.71-17.11-17.22-17.11
            c-9.51,0-17.22,7.66-17.22,17.11v51.37c0,9.45,7.7,17.12,17.22,17.12c9.5,0,17.22-7.67,17.22-17.12v-4.3
            c0-4.99,4.63-9.05,10.33-9.05c5.71,0,10.34,4.06,10.34,9.05v58.72c0,9.03,7.7,16.36,17.22,16.36c9.5,0,17.22-7.33,17.22-16.36
            v-80.1c0-4.99,4.63-9.05,10.33-9.05c5.71,0,10.34,4.06,10.34,9.05v40.35c0,9.04,7.7,16.36,17.22,16.36
            c9.5,0,17.22-7.32,17.22-16.36v-29.67c0-4.99,4.63-9.05,10.34-9.05c5.7,0,10.33,4.06,10.33,9.05v31.71
            c0,9.03,7.71,16.35,17.22,16.35c9.51,0,17.22-7.32,17.22-16.35V188.5C301.58,179.47,293.88,172.15,284.36,172.15"/>
          <path fill="#ffffff" d="M339.46,216.33c-9.51,0-17.22,7.32-17.22,16.35v65.13c0,9.03,7.7,16.35,17.22,16.35
            c9.5,0,17.22-7.32,17.22-16.35v-65.13C356.68,223.65,348.97,216.33,339.46,216.33"/>
          <path fill="#ffffff" d="M394.56,249.45c-9.5,0-17.22,7.32-17.22,16.35v16.21c0,9.03,7.71,16.35,17.22,16.35
            c9.51,0,17.22-7.32,17.22-16.35V265.8C411.78,256.77,404.08,249.45,394.56,249.45"/>
        </g>
      </svg>
    )
  },
]

export default function PlatformGrid() {
  return (
    <div className="flex flex-wrap justify-center gap-3 md:gap-3 max-w-6xl mx-auto my-4 md:my-8 px-2 md:px-4">
      {platforms.map((platform) => (
        <Link
          key={platform.name}
          href={platform.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-5 py-3 md:px-4 md:py-2.5 bg-white rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-95 transition-all duration-200 border border-gray-100 group cursor-pointer"
        >
          <div className="h-7 w-7 md:h-6 md:w-6 relative flex items-center justify-center flex-shrink-0">
            {platform.customSvg ? (
              <div className="w-7 h-7 md:w-6 md:h-6">{platform.customSvg}</div>
            ) : (
              <i className={`${platform.icon} text-2xl md:text-xl text-[#4a90e2] group-hover:text-primary transition-colors`}></i>
            )}
          </div>
          <span className="font-medium text-base md:text-sm text-gray-700 group-hover:text-primary transition-colors whitespace-nowrap">
            {platform.name}
          </span>
        </Link>
      ))}
    </div>
  )
}
