const icons = {
  steps: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h6M4 12h10M4 18h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="6" r="2" fill="currentColor" />
      <circle cx="18" cy="12" r="2" fill="currentColor" />
      <circle cx="18" cy="18" r="2" fill="currentColor" />
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="13" y="4" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="4" y="13" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="13" y="13" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  ),
  tag: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 12 12 20l-8-8V4h8l8 8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    </svg>
  ),
  faq: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
      <path
        d="M9.5 9.2a2.7 2.7 0 0 1 5 1.4c0 1.6-2.5 2-2.5 3.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
  ),
  login: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M5 20c1.8-3.5 5-5 7-5s5.2 1.5 7 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 2.01.52 3.97 1.51 5.7L2 22l4.58-1.2a9.86 9.86 0 0 0 5.46 1.64h.005c5.46 0 9.91-4.45 9.91-9.91C22.95 6.45 18.5 2 12.04 2Zm0 17.96h-.004a8.1 8.1 0 0 1-4.12-1.13l-.295-.175-2.89.76.77-2.82-.192-.305a8.07 8.07 0 0 1-1.24-4.31c0-4.46 3.63-8.09 8.1-8.09 2.16 0 4.2.84 5.73 2.37a8.03 8.03 0 0 1 2.36 5.72c0 4.46-3.63 8.09-8.09 8.09Zm4.49-6.05c-.25-.12-1.47-.73-1.7-.81-.23-.08-.4-.12-.57.12-.17.25-.66.81-.81.97-.15.17-.3.19-.55.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.3.38-.45.12-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.12-.57-1.37-.78-1.88-.2-.51-.41-.44-.57-.45-.15-.01-.32-.01-.49-.01-.17 0-.45.06-.68.32-.23.25-.89.87-.89 2.13 0 1.25.91 2.46 1.04 2.63.13.17 1.79 2.73 4.33 3.83.61.26 1.08.41 1.45.53.61.19 1.16.16 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.16-.48-.28Z"
      />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16v11H8l-4 4V5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  calculator: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M8 7h8M8 12h2M12 12h2M16 12h2M8 16h2M12 16h2M16 16h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M5.5 19c1.5-3 4-4.5 6.5-4.5s5 1.5 6.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  trendUp: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 16l5-5 4 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M15 7h4v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  headphones: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 13v2.5A2.5 2.5 0 0 0 6.5 18H8v-5H5.5A1.5 1.5 0 0 0 4 14.5V13a8 8 0 1 1 16 0v1.5A1.5 1.5 0 0 1 18.5 13H16v5h1.5A2.5 2.5 0 0 0 20 15.5V13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  ),
  currency: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 4v16M16.5 7.5C15.7 6.2 14.4 5.5 12.5 5.5c-2.4 0-4 1.2-4 3 0 4 8 1.6 8 5.8 0 2-1.7 3.4-4 3.4-2 0-3.4-.8-4.2-2.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  ),
  frown: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
      <circle cx="15" cy="10" r="1" fill="currentColor" />
      <path d="M8.5 15.5c1.2-1.2 2.7-1.8 3.5-1.8s2.3.6 3.5 1.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.8 7.2 18.4l.9-5.4-3.9-3.8 5.4-.8L12 3.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  ),
  sparkle: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.2 13.7 10.3 21.8 12 13.7 13.7 12 21.8 10.3 13.7 2.2 12 10.3 10.3 12 2.2Z"
        fill="currentColor"
      />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 12.5 9.5 17 19 7.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.5 19 6.5v5.2c0 4.4-2.9 7.5-7 8.8-4.1-1.3-7-4.4-7-8.8V6.5L12 3.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M9.2 12.2 11.2 14.2 15.2 9.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  ),
  truck: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7h11v10H3V7Zm11 3h4l3 3v4h-7v-7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
      <circle cx="7" cy="18" r="2" fill="currentColor" />
      <circle cx="17" cy="18" r="2" fill="currentColor" />
    </svg>
  ),
  coins: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="9" cy="9" rx="5" ry="3" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M4 9v4c0 1.7 2.2 3 5 3s5-1.3 5-3V9" stroke="currentColor" strokeWidth="2" fill="none" />
      <ellipse cx="15" cy="13" rx="5" ry="3" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="16" height="5" rx="1.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="4" y="10" width="16" height="5" rx="1.5" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="4" y="16" width="10" height="4" rx="1.5" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  ),
  bars: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  config: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
      <path
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10 14a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7l-1 1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M14 10a4 4 0 0 0-5.7 0L6 12.3a4 4 0 0 0 5.7 5.7l1-1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  ),
  orders: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  bag: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 8h12l-.8 11.2a2 2 0 0 1-2 1.8H8.8a2 2 0 0 1-2-1.8L6 8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M9 8V6.5A3 3 0 0 1 12 3.5 3 3 0 0 1 15 6.5V8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  ),
  palette: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.5a8.5 8.5 0 0 0-1.2 16.9c.9.1 1.4-.5 1.4-1.2 0-.5.2-1 .6-1.3.4-.3.9-.4 1.4-.3 2.8.4 5.3-1.8 5.3-4.7A8.5 8.5 0 0 0 12 3.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="8.2" cy="10" r="1.1" fill="currentColor" />
      <circle cx="11" cy="7.5" r="1.1" fill="currentColor" />
      <circle cx="14.5" cy="8.2" r="1.1" fill="currentColor" />
      <circle cx="16" cy="11.5" r="1.1" fill="currentColor" />
    </svg>
  ),
  store: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 9.5 5.5 5h13L20 9.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M4 9.5h16v9.5H4V9.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
      <path d="M9 19v-5h6v5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6.5 16.5h11l-1.2-1.5V11a4.3 4.3 0 1 0-8.6 0v4l-1.2 1.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M10 18.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  mapPin: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 21s6-5.2 6-10.2A6 6 0 0 0 6 10.8C6 15.8 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="12" cy="10.5" r="2.2" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="9" cy="10" r="1.6" fill="currentColor" />
      <path
        d="M5.5 16.5 9.5 13l3 2.5 3.5-4 2.5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  ),
  chevronRight: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  chevronDown: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  chevronUp: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  quote: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 11c0-2.2 1.5-4 3.5-4.5C13 6 14 7.5 13 9c-.8 1.6-2.2 2.5-4 3l1 3C8.5 14.2 5 12.5 5 9c0-3.3 2.7-6 6-6"
        fill="currentColor"
        opacity="0.35"
      />
    </svg>
  ),
};

export default function LandingIcon({ name, className = '' }) {
  const icon = icons[name];
  if (!icon) return null;
  return <span className={`landing-icon${className ? ` ${className}` : ''}`}>{icon}</span>;
}
