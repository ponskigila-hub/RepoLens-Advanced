'use client';

import {
  siCplusplus,
  siCss,
  siDocker,
  siFastapi,
  siGithub,
  siGo,
  siHtml5,
  siJavascript,
  siKotlin,
  siMysql,
  siNextdotjs,
  siOpenjdk,
  siPhp,
  siPostgresql,
  siPython,
  siReact,
  siRedis,
  siRuby,
  siRust,
  siSqlite,
  siSvelte,
  siSwift,
  siTailwindcss,
  siTypescript,
  siVuedotjs,
} from 'simple-icons';
import type { SimpleIcon } from 'simple-icons';

const ICONS: Record<string, SimpleIcon> = {
  javascript: siJavascript,
  typescript: siTypescript,
  python: siPython,
  react: siReact,
  'next.js': siNextdotjs,
  nextjs: siNextdotjs,
  fastapi: siFastapi,
  'tailwind css': siTailwindcss,
  tailwindcss: siTailwindcss,
  go: siGo,
  rust: siRust,
  java: siOpenjdk,
  'c++': siCplusplus,
  css: siCss,
  html: siHtml5,
  docker: siDocker,
  postgresql: siPostgresql,
  postgres: siPostgresql,
  mysql: siMysql,
  redis: siRedis,
  sqlite: siSqlite,
  kotlin: siKotlin,
  php: siPhp,
  ruby: siRuby,
  swift: siSwift,
  svelte: siSvelte,
  vue: siVuedotjs,
  github: siGithub,
};

const FALLBACKS: Record<string, string> = {
  javascript: 'JS', typescript: 'TS', python: 'Py', go: 'Go', rust: 'Rs', java: 'J',
  'c++': 'C++', 'c/c++': 'C/C++', c: 'C', html: '5', css: 'CSS', shell: '$',
};

export default function TechLogo({ name, small = false }: { name: string; small?: boolean }) {
  const key = name.trim().toLowerCase();
  const icon = ICONS[key];
  const boxSize = small ? 'h-5 w-5 rounded-md p-1' : 'h-9 w-9 rounded-lg p-2';

  if (icon) {
    return (
      <span className={`inline-flex shrink-0 items-center justify-center border border-black/5 bg-white ${boxSize}`} title={`${name} logo`}>
        <svg viewBox="0 0 24 24" className="h-full w-full" role="img" aria-label={`${name} logo`}>
          <path fill={`#${icon.hex}`} d={icon.path} />
        </svg>
      </span>
    );
  }

  const initials = FALLBACKS[key] || name.split(/[ ._/-]/).filter(Boolean).map((part) => part[0]).join('').slice(0, 3).toUpperCase() || '?';
  return (
    <span aria-label={`${name} text marker`} title={name} className={`inline-flex shrink-0 items-center justify-center border border-[#c7d6c8] bg-[#e8f0e6] font-bold text-[#285436] ${boxSize} ${small ? 'text-[7px]' : 'text-[10px]'}`}>
      {initials}
    </span>
  );
}
