import type {Metadata} from 'next'
import {Geist_Mono, Instrument_Serif} from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'

// Departure Mono by Helena Zhang, SIL Open Font License (see app/fonts/DepartureMono-LICENSE.txt)
const pixel = localFont({src: './fonts/DepartureMono-Regular.woff2', variable: '--font-pixel'})
const serif = Instrument_Serif({variable: '--font-serif', subsets: ['latin'], weight: '400', style: ['normal', 'italic']})
const mono = Geist_Mono({variable: '--font-geist-mono', subsets: ['latin']})

export const metadata: Metadata = {
  title: 'Pit Wall · F1 2026 quiz',
  description: 'The F1 quiz for people just getting into F1. Every answer is checked against the race data in Sanity.',
}

export default function RootLayout({children}: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${pixel.variable} ${serif.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
