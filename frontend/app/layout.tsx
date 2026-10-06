import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'RepoLens AI — Understand any repository',
  description: 'A clear, evidence-based first look at a public GitHub repository: code shape, engineering signals, and practical next steps.',
  keywords: ['GitHub', 'repository analysis', 'AST', 'code quality', 'developer tools'],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "(() => { try { const saved = localStorage.getItem('repolens-theme'); const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; document.documentElement.dataset.theme = saved || preferred; } catch { document.documentElement.dataset.theme = 'light'; } })();" }} />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
