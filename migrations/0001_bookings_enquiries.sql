-- Consultation bookings (Razorpay) and contact enquiries.
CREATE TABLE IF NOT EXISTS bookings (
  id                   TEXT PRIMARY KEY,
  created_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  name                 TEXT NOT NULL,
  email                TEXT NOT NULL,
  phone                TEXT NOT NULL,
  client_type          TEXT NOT NULL,
  service              TEXT,
  preferred_date       TEXT,
  preferred_time       TEXT,
  communication_method TEXT NOT NULL,
  description          TEXT,
  payment_status       TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  amount_paise         INTEGER NOT NULL,
  razorpay_order_id    TEXT NOT NULL UNIQUE,
  razorpay_payment_id  TEXT,
  paid_at              TEXT
);
CREATE INDEX IF NOT EXISTS bookings_status_created ON bookings (payment_status, created_at DESC);

CREATE TABLE IF NOT EXISTS enquiries (
  id         TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT NOT NULL,
  service    TEXT,
  message    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS enquiries_created ON enquiries (created_at DESC);
