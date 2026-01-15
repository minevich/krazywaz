import type { Metadata } from 'next'
import { Inter, Lora } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/Toast'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const lora = Lora({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-lora',
})

export const metadata: Metadata = {
  title: "Rabbi Kraz's Shiurim",
  description: 'Timeless Torah wisdom, delivered with passion.',
  openGraph: {
    title: "Rabbi Kraz's Shiurim",
    description: 'Timeless Torah wisdom, delivered with passion.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: "Rabbi Kraz's Shiurim",
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Rabbi Kraz's Shiurim",
    description: 'Timeless Torah wisdom, delivered with passion.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className={`${inter.variable} ${lora.variable} font-sans antialiased`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}

