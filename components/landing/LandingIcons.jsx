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
