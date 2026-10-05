interface RepoLensMarkProps {
  className?: string;
  title?: string;
}

export default function RepoLensMark({ className = 'h-12 w-12', title = 'RepoLens' }: RepoLensMarkProps) {
  return (
    <svg className={className} viewBox="0 0 80 80" fill="none" role="img" aria-label={title}>
      <circle cx="34" cy="33" r="25" stroke="url(#lens-ring)" strokeWidth="5" />
      <path d="m52 52 17 17" stroke="url(#lens-ring)" strokeWidth="6" strokeLinecap="round" />
      <path d="m23 35 10-13 13 8-1 15-14 2-8-12Z" stroke="#55E8E0" strokeOpacity=".82" strokeWidth="1.8" />
      <path d="m33 22 1 25m12-17-22 5m22-5-14 17" stroke="#55E8E0" strokeOpacity=".68" strokeWidth="1.4" />
      <circle cx="33" cy="22" r="3.6" fill="#78F5EA" />
      <circle cx="46" cy="30" r="3.6" fill="#7A91FF" />
      <circle cx="47" cy="45" r="3.6" fill="#72E7E5" />
      <circle cx="33" cy="47" r="3.6" fill="#8D63F8" />
      <circle cx="23" cy="35" r="3.6" fill="#62DDE2" />
      <defs>
        <linearGradient id="lens-ring" x1="6" y1="5" x2="70" y2="72" gradientUnits="userSpaceOnUse">
          <stop stopColor="#62F0E5" />
          <stop offset=".56" stopColor="#39BCE3" />
          <stop offset="1" stopColor="#8657F7" />
        </linearGradient>
      </defs>
    </svg>
  );
}
