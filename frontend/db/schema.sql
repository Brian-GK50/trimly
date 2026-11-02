CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'owner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
  ON users (lower(email));

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_expiration_idx ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  address TEXT NOT NULL,
  rating NUMERIC(2, 1) NOT NULL,
  reviews INTEGER NOT NULL CHECK (reviews >= 0),
  category TEXT NOT NULL,
  open_label TEXT NOT NULL,
  image TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS shops_owner_user_idx ON shops (owner_user_id);

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  initials TEXT NOT NULL,
  rating NUMERIC(2, 1) NOT NULL,
  UNIQUE (shop_id, id)
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  shop_id TEXT NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  duration INTEGER NOT NULL CHECK (duration > 0),
  price INTEGER NOT NULL CHECK (price > 0),
  UNIQUE (shop_id, id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id),
  shop_id TEXT NOT NULL REFERENCES shops(id),
  service_id TEXT NOT NULL,
  staff_id TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  total INTEGER NOT NULL CHECK (total > 0),
  deposit INTEGER NOT NULL CHECK (deposit > 0),
  status TEXT NOT NULL CHECK (status IN ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (shop_id, service_id) REFERENCES services(shop_id, id),
  FOREIGN KEY (shop_id, staff_id) REFERENCES staff(shop_id, id)
);

CREATE UNIQUE INDEX IF NOT EXISTS bookings_active_staff_slot_unique
  ON bookings (staff_id, starts_at)
  WHERE status IN ('PENDING_PAYMENT', 'CONFIRMED');

CREATE INDEX IF NOT EXISTS bookings_user_created_idx
  ON bookings (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  phone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUND_REQUIRED')),
  merchant_request_id TEXT,
  checkout_request_id TEXT UNIQUE,
  receipt_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_booking_created_idx
  ON payments (booking_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS payments_one_pending_per_booking
  ON payments (booking_id)
  WHERE status = 'PENDING';
  

INSERT INTO shops (id, name, location, address, rating, reviews, category, open_label, image)
VALUES
  ('the-groom-room', 'The Groom Room', 'Westlands, Nairobi', 'Mpaka Road, Westlands', 4.9, 128, 'Barbershop', 'Open until 8:00 PM', 'linear-gradient(140deg, #39332b, #a07b53)'),
  ('studio-26', 'Studio 26', 'Kilimani, Nairobi', 'Argwings Kodhek Road, Kilimani', 4.8, 94, 'Salon & barber', 'Open until 7:00 PM', 'linear-gradient(140deg, #544650, #b47e72)'),
  ('fresh-cuts', 'Fresh Cuts Social', 'Lavington, Nairobi', 'Lavington Green Shopping Centre', 4.7, 76, 'Barbershop', 'Open until 9:00 PM', 'linear-gradient(140deg, #243b36, #72917b)')
ON CONFLICT (id) DO NOTHING;

INSERT INTO services (id, shop_id, name, description, duration, price)
VALUES
  ('classic-cut', 'the-groom-room', 'Classic haircut', 'A clean cut, finished your way.', 40, 1200),
  ('skin-fade', 'the-groom-room', 'Skin fade', 'A sharp, seamless fade and style.', 50, 1500),
  ('beard-trim', 'the-groom-room', 'Beard trim', 'Shape, detail and a hot towel finish.', 25, 800),
  ('signature-cut', 'studio-26', 'Signature cut', 'A tailored cut with wash and style.', 45, 1800),
  ('cut-beard', 'studio-26', 'Cut & beard', 'The complete freshen-up.', 60, 2400),
  ('wash-style', 'studio-26', 'Wash & style', 'A relaxing wash and expert finish.', 35, 1000),
  ('express-cut', 'fresh-cuts', 'Express cut', 'A quick tidy-up, no compromises.', 30, 1000),
  ('fade', 'fresh-cuts', 'Signature fade', 'Precision fades for every style.', 45, 1400),
  ('hot-towel', 'fresh-cuts', 'Hot towel shave', 'A classic close shave and unwind.', 30, 1100)
ON CONFLICT (id) DO NOTHING;

INSERT INTO staff (id, shop_id, name, role, initials, rating)
VALUES
  ('james', 'the-groom-room', 'James Mwangi', 'Master barber', 'JM', 4.9),
  ('kevin', 'the-groom-room', 'Kevin Otieno', 'Senior barber', 'KO', 4.8),
  ('brian', 'studio-26', 'Brian Kamau', 'Style director', 'BK', 5.0),
  ('ian', 'studio-26', 'Ian Maina', 'Barber', 'IM', 4.8),
  ('sam', 'fresh-cuts', 'Sam Kibet', 'Master barber', 'SK', 4.9),
  ('eli', 'fresh-cuts', 'Eli Wanjala', 'Barber', 'EW', 4.7)
ON CONFLICT (id) DO NOTHING;
