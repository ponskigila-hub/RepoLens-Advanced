import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RepoLens AI - Understand Any Repository Instantly',
  description: 'AI-powered GitHub repository analyzer that provides instant insights about any codebase',
  keywords: ['GitHub', 'AI', 'Repository', 'Analysis', 'Code Review', 'Developer Tools'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}

// Made with Bob
