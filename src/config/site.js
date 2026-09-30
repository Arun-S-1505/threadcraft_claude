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
    city: 'India',
  },

  // Leave empty ('') to hide the icon in the footer. Use full URLs.
  social: {
    instagram: '',
    facebook: '',
    youtube: '',
    x: '',
  },

  currency: { symbol: '₹', locale: 'en-IN', code: 'INR' },

  policy: {
    freeShippingThreshold: 999, // order value (in currency units) for free shipping
    shippingFee: 79, // flat fee below the threshold
    codFee: 0,
    gstRate: 0.05, // apparel under ₹1,000 is 5% GST in India, adjust if needed
    dispatchHours: 48, // "printed and shipped within 48 hours"
    returnDays: 7,
    gsmRegular: 180, // regular fit tees
    gsmOversized: 240, // oversized tees
  },

  // Announcement bar (scrolling strip above the navbar)
  announcements: [
    'Free shipping on orders above ₹999',
    'Cash on Delivery available',
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
