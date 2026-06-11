// FileZaar Logo — inline SVG fallback if /logo.png fails
export function Logo({ size = 28 }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: 6, flexShrink: 0 }}
    >
      <rect width="32" height="32" rx="7" fill="url(#gz)" />
      {/* Z letter */}
      <text x="5" y="24" fontFamily="system-ui,sans-serif" fontWeight="900"
            fontSize="22" fill="white" letterSpacing="-2">Z</text>
      {/* Lightning bolt accent */}
      <polygon points="20,4 14,16 18,16 12,28 22,14 17,14" fill="#a3e635" opacity="0.9"/>
      <defs>
        <linearGradient id="gz" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c5cfc"/>
          <stop offset="100%" stopColor="#5b21b6"/>
        </linearGradient>
      </defs>
    </svg>
  )
}
