import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Must Be Viral',
  description: 'AI-powered content creation and influencer matching platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}