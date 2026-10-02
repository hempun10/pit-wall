import {inkOn} from '@/lib/f1'

export function ChevronIcon({dir}: {dir: 'left' | 'right'}) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d={dir === 'left' ? 'M12.5 4 6.5 10l6 6' : 'M7.5 4l6 6-6 6'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export function SpeakerIcon({muted}: {muted: boolean}) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 8v4h3l4 3.5v-11L6 8z" fill="currentColor" />
      {muted ? (
        <path d="M13.5 7.5l5 5m0-5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <path d="M13 7.2a4 4 0 0 1 0 5.6M15.4 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      )}
    </svg>
  )
}

// Drawn in code rather than using driver photos or team imagery, which are copyrighted
export function HelmetIcon({color}: {color: string}) {
  return (
    <svg viewBox="0 0 48 40" width="40" height="34" aria-hidden="true" className="shrink-0">
      <path d="M6 26C6 13 15 5 27 5c11 0 17 7 17 17v7c0 3-2 5-5 5H13c-4 0-7-3-7-7z" fill={color} />
      <path d="M22 14h21c.6 2 1 4.5 1 7v2H24c-2 0-3.5-1.5-3.5-3.5V16c0-1 .5-2 1.5-2z" fill="#0b0b0c" />
      <path d="M26 16.5h13" stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 29.5h34" stroke={inkOn(color)} strokeOpacity=".45" strokeWidth="2" />
    </svg>
  )
}

export function CarIcon({color}: {color: string}) {
  return (
    <svg viewBox="0 0 96 32" width="56" height="19" aria-hidden="true" className="shrink-0">
      <path d="M3 5h13v6H3z" fill={color} />
      <path d="M8 11h3v8H8z" fill="#3a3a3c" />
      <path d="M10 21l4-7 20-2 12-4h12l4 4 22 4 10 3v3H10z" fill={color} />
      <path d="M46 8l6-5h4l2 5z" fill="#0b0b0c" />
      <path d="M82 23h13v2.5H82z" fill={color} />
      <circle cx="22" cy="22" r="8" fill="#111" stroke="#3a3a3c" strokeWidth="2" />
      <circle cx="76" cy="23" r="7" fill="#111" stroke="#3a3a3c" strokeWidth="2" />
    </svg>
  )
}
