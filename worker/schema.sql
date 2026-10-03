-- ThreadCraft D1 schema. Apply with: npm run db:local  (or db:remote)

CREATE TABLE IF NOT EXISTS orders (
  id               TEXT PRIMARY KEY,
  kind             TEXT NOT NULL DEFAULT 'custom' CHECK (kind IN ('custom','shop')),
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new','paid','printing','shipped','delivered','cancelled')),
  payment_method   TEXT NOT NULL DEFAULT 'online' CHECK (payment_method IN ('online','cod','invoice')),
  payment_status   TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','failed','refunded')),
  payment_id       TEXT,
  gateway_order_id TEXT,
  tracking_no      TEXT,
  customer_name    TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT NOT NULL,
  address          TEXT NOT NULL,
  city             TEXT NOT NULL,
  pincode          TEXT NOT NULL,
  notes            TEXT,
  size             TEXT,              -- custom orders only
  quantity         INTEGER NOT NULL,
  unit_price       INTEGER NOT NULL,  -- INR. custom: per garment. shop: items subtotal
  shipping         INTEGER NOT NULL DEFAULT 0,
  total            INTEGER NOT NULL,  -- INR, always recomputed on the server
  spec_json        TEXT NOT NULL      -- custom: frozen design spec. shop: { items: [...] }
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

-- Every stored blob, keyed by sha256 (dedupes identical uploads). Bytes live in R2 at files/<sha256>.
CREATE TABLE IF NOT EXISTS files (
  sha256     TEXT PRIMARY KEY,
  mime       TEXT NOT NULL,
  size       INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_files (
  order_id TEXT NOT NULL REFERENCES orders (id),
  sha256   TEXT NOT NULL REFERENCES files (sha256),
  kind     TEXT NOT NULL CHECK (kind IN ('original','text_raster','preview')),
  label    TEXT,                      -- preview view name, or design item id
  PRIMARY KEY (order_id, sha256, kind, label)
);

CREATE TABLE IF NOT EXISTS status_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    TEXT NOT NULL REFERENCES orders (id),
  status      TEXT NOT NULL,
  tracking_no TEXT,
  actor       TEXT NOT NULL,          -- 'customer', 'system', 'webhook' or an admin email
  at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_history_order ON status_history (order_id);

-- Gateway webhook deliveries already processed (idempotency)
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL
);

-- Contact-form and bulk-quote requests
CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT NOT NULL CHECK (kind IN ('contact','bulk')),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  body_json  TEXT NOT NULL,
  handled    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages (created_at DESC);
