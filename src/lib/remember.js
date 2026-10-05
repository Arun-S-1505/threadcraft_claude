import { api } from './api'

/**
 * After a signed-in customer places an order, save their contact and delivery details on their
 * account so the next order is pre-filled. Best effort: a failure here must never affect the order.
 * New customers have an empty profile, so their first order starts with empty fields.
 */
export function rememberDetails(user, setUser, d) {
  if (!user) return
  const name = (d.name || user.name || '').trim()
  if (name.length < 2) return
  api('/api/me', {
    method: 'PATCH',
    json: {
      name,
      phone: d.phone ?? user.phone ?? '',
      address: d.address ?? user.address ?? '',
      city: d.city ?? user.city ?? '',
      state: d.state ?? user.state ?? '',
      pincode: d.pincode ?? user.pincode ?? '',
    },
  })
    .then((res) => res?.user && setUser(res.user))
    .catch(() => {})
}
