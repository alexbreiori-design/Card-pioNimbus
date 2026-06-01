import { getAdminFileIconPath } from '@/lib/adminFileIcons';
import AdminFileIcon from './AdminFileIcon';

export default function AdminIcon({ name, className = '' }) {
  const fileSrc = getAdminFileIconPath(name);
  if (fileSrc) {
    return <AdminFileIcon src={fileSrc} className={className} />;
  }

  const icons = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </>
    ),
    archive: (
      <>
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M15 3v4h4" />
        <path d="M9 12h6" />
        <path d="M9 16h6" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    orders: (
      <>
        <path d="M7 7h10v13H7z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </>
    ),
    prep: (
      <>
        <path d="M6 10h12l-1 9H7z" />
        <path d="M9 10V8a3 3 0 0 1 6 0v2" />
        <path d="M4 10h16" />
      </>
    ),
    delivery: (
      <>
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
        <path d="M5 17H3l2-6h4l2 3h3l2-5h3" />
        <path d="M9 11h3l2 3" />
        <path d="M16 8l1-3" />
        <path d="M13 7l-2-2" />
      </>
    ),
    done: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M8.5 12.5l2.3 2.3 4.7-5.1" />
      </>
    ),
    burger: (
      <>
        <path d="M5 12h14" />
        <path d="M6 9c1.3-2 3.2-3 6-3s4.7 1 6 3" />
        <path d="M6 15h12" />
        <path d="M7 18h10" />
      </>
    ),
    category: (
      <>
        <rect x="5" y="5" width="6" height="6" rx="1.5" />
        <rect x="13" y="5" width="6" height="6" rx="1.5" />
        <rect x="5" y="13" width="6" height="6" rx="1.5" />
        <rect x="13" y="13" width="6" height="6" rx="1.5" />
      </>
    ),
    customer: (
      <>
        <path d="M18 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="10.5" cy="7" r="4" />
      </>
    ),
    phone: (
      <>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </>
    ),
    location: (
      <>
        <circle cx="12" cy="10" r="3" />
        <path d="M12 21c4.8-4.3 7-7.8 7-11a7 7 0 1 0-14 0c0 3.2 2.2 6.7 7 11z" />
      </>
    ),
    cart: (
      <>
        <path d="M5 6h2l2 10h8l2-7H8" />
        <circle cx="10" cy="20" r="1.5" />
        <circle cx="17" cy="20" r="1.5" />
      </>
    ),
    image: (
      <>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.7" />
        <path d="M7 17l4-4 3 3 2-2 2 3" />
      </>
    ),
    sort: (
      <>
        <path d="M8 4v14" />
        <path d="M5 7l3-3 3 3" />
        <path d="M16 20V6" />
        <path d="M13 17l3 3 3-3" />
      </>
    ),
    printer: (
      <>
        <path d="M6 9V3h12v6" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="7" />
      </>
    ),
    promo: (
      <>
        <path d="M20 12l-8 8-8-8V4h8z" />
        <path d="M8 8h.01" />
        <path d="M15 9l-6 6" />
      </>
    ),
    coupon: (
      <>
        <path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z" />
        <path d="M9 9l6 6" />
        <path d="M15 9l-6 6" />
      </>
    ),
    customers: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M21 21v-2a3 3 0 0 0-2.4-2.9" />
        <path d="M16 3.2a4 4 0 0 1 0 7.6" />
      </>
    ),
    integration: (
      <>
        <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2" />
        <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
    pix: (
      <>
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" />
        <path d="M11 7h2" />
        <path d="M7 11v2" />
        <path d="M17 13h2" />
        <path d="M13 17v2" />
      </>
    ),
    store: (
      <>
        <path d="M3 10l9-6 9 6" />
        <path d="M5 10v9h14v-9" />
        <path d="M10 19v-5h4v5" />
      </>
    ),
    meta: (
      <>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="currentColor" stroke="none" />
        <path d="M13.2 7.5h-2.4l-2.1 9h2.1l.4-1.7h2.3l.4 1.7h2.1L13.2 7.5zm-2.5 5.5l.9-3.6.9 3.6h-1.8z" fill="#fff" stroke="none" />
      </>
    ),
  };

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icons[name] || icons.category}
    </svg>
  );
}
