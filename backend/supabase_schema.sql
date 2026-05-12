-- Run this in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin','kitchen')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL,
  image       TEXT,
  available   BOOLEAN DEFAULT TRUE,
  category_id INTEGER REFERENCES categories(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER REFERENCES users(id),
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled','rejected')),
  total               NUMERIC(10,2),
  address             TEXT,
  contact_name        TEXT,
  contact_phone       TEXT,
  latitude            FLOAT,
  longitude           FLOAT,
  prep_time           INTEGER DEFAULT 10,
  rider_time          INTEGER DEFAULT 15,
  coupon_code         TEXT,
  discount            NUMERIC(10,2) DEFAULT 0,
  special_note        TEXT,
  rejection_reason    TEXT,
  rating              INTEGER CHECK (rating BETWEEN 1 AND 5),
  review              TEXT,
  confirmed_at        TIMESTAMPTZ,
  preparing_at        TIMESTAMPTZ,
  out_for_delivery_at TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id                   SERIAL PRIMARY KEY,
  order_id             INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id         INTEGER REFERENCES menu_items(id),
  quantity             INTEGER NOT NULL,
  price                NUMERIC(10,2) NOT NULL,
  special_instructions TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Admin user (change password hash as needed, or create via /api/auth/register then update role)
-- INSERT INTO users (name, email, password, role) VALUES ('Admin', 'admin@foodapp.com', '<bcrypt_hash>', 'admin');
