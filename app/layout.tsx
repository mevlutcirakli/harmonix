import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '@livekit/components-styles'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Harmonix',
  description: 'Harmonix — sesli ve yazılı sohbet platformu',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  )
}
