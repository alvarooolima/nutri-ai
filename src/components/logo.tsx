export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" fill="#2f6b4f" />
      <path d="M20 42c0-13 9-22 26-24-1 16-10 26-23 26-1 0-2 0-3-2z" fill="#e2eee6" />
      <path d="M22 44c5-8 11-13 19-18" stroke="#2f6b4f" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
