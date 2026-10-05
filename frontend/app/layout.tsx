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
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
