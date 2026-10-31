/**
 * ThreadCraft – single source of truth for brand, contact and store policy.
 * Edit values here and the whole storefront updates (navbar, footer, FAQ, cart, checkout).
 *
 * IMPORTANT: everything in `policy` is shown to customers as a promise.
 * Only keep a promise if the business can actually deliver it.
 */
export const SITE = {
  name: 'ThreadCraft',
  tagline: 'Custom printed apparel, made to order',
  description:
    'Original t-shirt collections and a custom print studio. Regular fit in 180 GSM and oversized in 240 GSM cotton, HD printing, made to order in India.',

  contact: {
    email: 'threadcraftcustomwear@gmail.com',
    // Leave empty ('') to hide. WhatsApp number in international format, digits only, e.g. '919876543210'
    whatsapp: '',
    phone: '',
    // No street address or personal phone is published on purpose: customers reach us by email and Instagram.
    city: 'India',
  },

  // Leave empty ('') to hide the icon in the footer. Use full URLs.
  social: {
    instagram: 'https://www.instagram.com/threadcraft._store',
    facebook: '',
    youtube: '',
    x: '',
  },

  currency: { symbol: '₹', locale: 'en-IN', code: 'INR' },

  policy: {
    // Collection orders always ship free. These two apply to CUSTOM STUDIO orders only (see shippingFor).
    freeShippingThreshold: 999, // custom order value (in currency units) for free delivery
    shippingFee: 79, // flat fee below the threshold
    dispatchHours: 48, // "printed and shipped within 48 hours"
    returnDays: 3,
    gsmRegular: 180, // regular fit tees
    gsmOversized: 240, // oversized tees
  },

  // Announcement bar (scrolling strip above the navbar)
  announcements: [
    'Free delivery on every collection order',
    'Secure payments · UPI, cards and netbanking',
    'Custom prints dispatched in 48 hours',
    '180 GSM regular · 240 GSM oversized',
  ],
}

export const NAV_LINKS = [
  { label: 'Shop', to: '/shop' },
  { label: 'Collections', to: '/collections' },
  { label: 'Custom Studio', to: '/studio', badge: 'New' },
  { label: 'Bulk Orders', to: '/bulk-orders' },
  { label: 'Our Craft', to: '/sustainability' },
]
