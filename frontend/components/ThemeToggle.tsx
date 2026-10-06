'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const active = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    setTheme(active);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem('repolens-theme', next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-pressed={theme === 'dark'}
      className="inline-flex items-center gap-2 rounded-lg border border-[#d9ddd2] bg-[#fffefa] px-3 py-2 text-xs font-semibold text-[#304239] transition hover:border-[#9fbea1]"
    >
      <span aria-hidden="true">{theme === 'dark' ? '☼' : '☾'}</span>
      <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
}
