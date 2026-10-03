/**
 * Monthly backup: writes last month's orders and messages to R2 as JSON.
 * Order files already live in R2 (content-addressed), so only the database rows need copying.
 * D1 also has its own Time Travel restore; this is an independent, human-readable copy.
 */
export function previousMonth(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export async function runMonthlyBackup(env, month = previousMonth()) {
  const range = [month, `${month}~`] // ISO timestamps sort as text: '2026-09-...' sits between these
  const orders = (await env.DB.prepare(`SELECT * FROM orders WHERE created_at >= ?1 AND created_at < ?2 ORDER BY created_at`).bind(...range).all()).results
  const messages = (await env.DB.prepare(`SELECT * FROM messages WHERE created_at >= ?1 AND created_at < ?2 ORDER BY created_at`).bind(...range).all()).results
  const put = (name, rows) => env.FILES.put(`backups/${month}/${name}.json`, JSON.stringify(rows), { httpMetadata: { contentType: 'application/json' } })
  await Promise.all([put('orders', orders), put('messages', messages)])
  return { month, orders: orders.length, messages: messages.length }
}
