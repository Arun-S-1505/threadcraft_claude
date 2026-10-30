// Builds the new-order email content from a saved order row. Online orders send their email only once the
// payment is confirmed (by the webhook), so it has to be rebuilt from what was stored.
import { PRINT_LABEL, printSummary } from '../../shared/designSpec.js'

export function orderMailPayload(row, paymentNote) {
  let spec = {}
  try {
    spec = JSON.parse(row.spec_json || '{}')
  } catch {
    /* keep empty */
  }
  const lines =
    row.kind === 'custom'
      ? [
          `${spec.garment?.fit} tee (${spec.garment?.gsm} GSM), size ${row.size}, ${spec.items?.length ?? 0} print(s) (${printSummary(spec.items || [])}), ${PRINT_LABEL[spec.garment?.printType] || spec.garment?.printType}`,
          `Quantity ${row.quantity} × ₹${row.unit_price} = ₹${row.unit_price * row.quantity}`,
          row.shipping ? `Delivery ₹${row.shipping}` : 'Free delivery',
        ]
      : (spec.items || []).map((i) => `${i.name} (${i.fitLabel}, ${i.colour}, ${i.size}) × ${i.qty}`)
  return {
    id: row.id,
    total: row.total,
    customer: { name: row.customer_name, email: row.email, phone: row.phone, address: row.address, city: row.city, pincode: row.pincode, notes: row.notes },
    lines,
    paymentNote,
  }
}
