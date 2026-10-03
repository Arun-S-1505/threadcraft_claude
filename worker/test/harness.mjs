// In-process stand-ins for Cloudflare bindings so the Worker can be tested with plain Node
// (useful where workerd cannot run). D1 -> node:sqlite, R2 -> Map, waitUntil -> awaited promises.
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import app from '../src/index.js'

export function makeD1() {
  const db = new DatabaseSync(':memory:')
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'))
  db.exec('PRAGMA foreign_keys = ON')

  const statement = (sql, args = []) => ({
    bind: (...a) => statement(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } }),
    _run: () => db.prepare(sql).run(...args),
  })
  return {
    prepare: (sql) => statement(sql),
    batch: async (stmts) => {
      db.exec('BEGIN')
      try {
        stmts.forEach((s) => s._run())
        db.exec('COMMIT')
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
      return stmts.map(() => ({ success: true }))
    },
  }
}

export function makeR2() {
  const store = new Map()
  return {
    store,
    head: async (k) => (store.has(k) ? { key: k } : null),
    put: async (k, bytes, opts) => void store.set(k, { bytes, opts }),
    get: async (k) => (store.has(k) ? { body: store.get(k).bytes } : null),
  }
}

const baseEnv = {
  ALLOWED_ORIGIN: 'http://localhost:5173',
  OWNER_EMAIL: 'owner@example.com',
  ADMIN_EMAILS: 'threadcraftcustomwear@gmail.com',
  RAZORPAY_WEBHOOK_SECRET: 'test_secret',
}

export function makeApi(envOverrides = {}) {
  const env = { ...baseEnv, DB: makeD1(), FILES: makeR2(), ...envOverrides }
  const pending = []
  const ctx = { waitUntil: (p) => pending.push(p), passThroughOnException() {} }
  const api = async (path, init) => {
    const res = await app.fetch(new Request('http://worker.test' + path, init), env, ctx)
    await Promise.allSettled(pending.splice(0))
    return res
  }
  return { api, env }
}
