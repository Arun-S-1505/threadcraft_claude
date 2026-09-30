/**
 * Dependency-free icon set (24x24, 1.6 stroke, round caps) – drop-in for an icon library.
 * Usage: <Icon name="bag" size={20} />
 */
const P = {
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  'arrow-left': <path d="M19 12H5M11 6l-6 6 6 6" />,
  'arrow-up-right': <path d="M7 17 17 7M8 7h9v9" />,
  bag: (
    <>
      <path d="M5 8h14l-1 12H6L5 8Z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </>
  ),
  heart: <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c.9-3.6 3.8-5.4 7.5-5.4s6.6 1.8 7.5 5.4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  x: <path d="m6 6 12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  trash: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 13h10l1-13M9 7V4.5h6V7" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6.5h11v10H3zM14 10h4l3 3v3.5h-7" />
      <circle cx="7.5" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5.5c0 4.3 2.9 7.6 7 9.5 4.1-1.9 7-5.2 7-9.5V6l-7-3Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="1.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18l-1.8-5.4-5.7-1.8L10.2 9 12 3.5Z" />
      <path d="M19 3v3M17.5 4.5h3" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="6.5" cy="17.5" r="2.5" />
      <path d="M8.3 8.3 20 18M8.3 15.7 20 6" />
    </>
  ),
  needle: (
    <>
      <path d="M19.5 3.5 6 19.5" />
      <path d="M17 3.2c2 0 3.3 1.4 3.3 3.3 0 1-.4 1.7-1 2.3L9 19c-.8.8-2 .5-2.6-.3" />
      <path d="M4 20.5c1.5-.6 2-2.3 3.5-2.5" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3.5c-5 0-8.5 3.4-8.5 7.8 0 4.6 3.6 8 8 8 1.6 0 2-1 1.5-2-.6-1.1 0-2.3 1.4-2.3H17c2 0 3.5-1.4 3.5-3.5C20.5 6.5 17 3.5 12 3.5Z" />
      <circle cx="7.8" cy="11" r=".9" />
      <circle cx="10.6" cy="7.6" r=".9" />
      <circle cx="15" cy="7.9" r=".9" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4.5 16v3.5h15V16" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8 12 3.5Z" />
      <path d="m3.5 12 8.5 4.5 8.5-4.5M3.5 16 12 20.5l8.5-4.5" />
    </>
  ),
  box: (
    <>
      <path d="m12 3 8 4.2v9.6L12 21l-8-4.2V7.2L12 3Z" />
      <path d="m4 7.2 8 4.3 8-4.3M12 11.5V21" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.5 12a7.5 7.5 0 0 1-13 5.1M4.5 12a7.5 7.5 0 0 1 13-5.1" />
      <path d="M17.5 3v4h-4M6.5 21v-4h4" />
    </>
  ),
  star: <path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8L12 3.6Z" />,
  leaf: (
    <>
      <path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" />
      <path d="M5 19c2-4 5-7 9-9" />
    </>
  ),
  zap: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z" />,
  ruler: (
    <>
      <path d="M3.5 15.5 15.5 3.5l5 5-12 12-5-5Z" />
      <path d="m7 12 2.2 2.2M10 9l2.2 2.2M13 6l2.2 2.2" />
    </>
  ),
  shirt: <path d="M8.5 4 3.5 6.5l2 4.2 2.5-1V20h8V9.7l2.5 1 2-4.2-5-2.5c-.5 1.5-1.8 2.3-3.5 2.3S9 5.5 8.5 4Z" />,
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  phone: <path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2C10 18.5 5.5 14 4.5 5.5a2 2 0 0 1 2-2Z" />,
  pin: (
    <>
      <path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </>
  ),
  cash: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="1.5" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M6.5 9.5v.01M17.5 14.5v.01" />
    </>
  ),
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" />
    </>
  ),
  cube: (
    <>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M4 7.5 12 12l8-4.5M12 12v9" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19.5c.7-3 3-4.6 5.5-4.6s4.8 1.6 5.5 4.6" />
      <path d="M15.5 5.8a3 3 0 0 1 0 5.4M17 15.2c2 .4 3.2 1.8 3.7 4.3" />
    </>
  ),
  message: <path d="M4 5.5h16v10.5H9.5L5 20v-4H4V5.5Z" />,
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="3.8" />
      <circle cx="17" cy="7" r=".6" />
    </>
  ),
  facebook: <path d="M14 8.5h2.5V5H14c-2.2 0-3.5 1.5-3.5 3.7V11H8v3.5h2.5V21H14v-6.5h2.4l.6-3.5H14V9c0-.3.2-.5.5-.5Z" />,
  youtube: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="4" />
      <path d="m10.5 9.5 4 2.5-4 2.5v-5Z" />
    </>
  ),
  x_social: <path d="M4 4l16 16M20 4 4 20" />,
  whatsapp: (
    <>
      <path d="M4 20l1.3-4.2A8.2 8.2 0 1 1 8.4 19L4 20Z" />
      <path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-.8.7c-1-.4-2-1.4-2.4-2.4l.7-.8-1-2L9 8.5Z" />
    </>
  ),
  printer: (
    <>
      <path d="M7 9V3.5h10V9M7 17H4.5v-7h15v7H17" />
      <rect x="7" y="14" width="10" height="6.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12.5V4.5h8l9 9-8 8-9-9Z" />
      <circle cx="8" cy="9" r="1.2" />
    </>
  ),
}

export default function Icon({ name, size = 20, stroke = 1.6, className = '', title, ...rest }) {
  const body = P[name]
  if (!body) return null
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`tc-icon ${className}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      {body}
    </svg>
  )
}

/** Filled star for ratings etc. */
export function StarFill({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8L12 3.6Z" />
    </svg>
  )
}
