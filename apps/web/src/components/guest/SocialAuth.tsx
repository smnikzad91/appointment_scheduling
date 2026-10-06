// Google / Apple sign-in isn't wired up (auth is phone/email + password via apps/api), so the
// buttons are shown disabled with «به‌زودی» rather than as dead buttons. Enable them here once
// apps/api has an OAuth flow.
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current" aria-hidden>
      <path d="M16.37 12.64c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.73-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.19-1.54 2.67-.39 6.62 1.1 8.79.73 1.06 1.6 2.25 2.74 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.7.71 2.87.69 1.19-.02 1.94-1.08 2.66-2.14.84-1.23 1.19-2.42 1.2-2.48-.03-.01-2.3-.88-2.33-3.5zM14.2 6.17c.6-.74 1.01-1.76.9-2.78-.87.04-1.93.58-2.55 1.31-.56.64-1.05 1.68-.92 2.68.97.07 1.96-.5 2.57-1.21z" />
    </svg>
  );
}

const PROVIDERS = [
  { name: "Google", label: "ورود با گوگل", icon: <GoogleMark /> },
  { name: "Apple", label: "ورود با اپل", icon: <AppleMark /> },
];

export default function SocialAuth({ style }: { style?: React.CSSProperties }) {
  return (
    <div className="g-rise" style={style}>
      <div className="my-6 flex items-center gap-3 text-xs text-g-faint">
        <span className="h-px flex-1 bg-gradient-to-l from-g-line-strong to-transparent" />
        یا
        <span className="h-px flex-1 bg-gradient-to-r from-g-line-strong to-transparent" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {PROVIDERS.map((p) => (
          <button
            key={p.name}
            type="button"
            disabled
            title="به‌زودی"
            className="group relative flex h-12 items-center justify-center gap-2 rounded-2xl border border-g-line bg-g-glass-soft text-sm font-bold text-g-ink/80 transition hover:border-g-line-strong disabled:cursor-not-allowed"
          >
            <span className="opacity-60 grayscale transition group-hover:opacity-90 group-hover:grayscale-0">{p.icon}</span>
            <span className="opacity-70">{p.label}</span>
            <span className="absolute -top-2 left-3 rounded-full border border-g-line-strong bg-g-bg-2 px-2 py-px text-[10px] font-bold text-g-accent-3">
              به‌زودی
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
