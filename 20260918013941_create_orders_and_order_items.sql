/*
# Create orders and order_items tables for waiter order flow

1. New Tables
- `orders`: stores a table's open order (the "comanda"). Columns:
  - id (uuid, primary key)
  - table_id (uuid, FK to tables.id) — which table the order belongs to
  - terrace_id (uuid, FK to terraces.id) — denormalized for convenience
  - customer_name (text) — name of the customer at the table
  - party_size (integer) — number of diners
  - status (text, check: 'open' | 'sent' | 'completed') — order lifecycle
  - total (numeric, default 0) — total price of the order in USD
  - created_at (timestptz)
- `order_items`: individual dish lines within an order. Columns:
  - id (uuid, primary key)
  - order_id (uuid, FK to orders.id ON DELETE CASCADE)
  - dish_id (uuid, FK to dishes.id) — which dish was ordered
  - dish_name (text) — snapshot of dish name at time of ordering
  - unit_price (numeric) — snapshot of price at time of ordering
  - quantity (integer, default 1) — how many of this dish
  - notes (text, nullable) — optional special instructions
  - created_at (timestptz)

2. Security
- Enable RLS on both tables.
- Add per-verb CRUD policies for anon + authenticated (single-tenant app, data is intentionally shared).

3. Notes
- Snapshots of dish_name and unit_price protect against menu edits changing historical orders.
- `orders` has a partial unique index on table_id WHERE status = 'open' to prevent duplicate open orders per table.
*/

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  terrace_id uuid NOT NULL REFERENCES terraces(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  party_size integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'sent', 'completed')),
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  dish_id uuid NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  dish_name text NOT NULL,
  unit_price numeric NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Prevent duplicate open orders per table
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_open_per_table ON orders(table_id) WHERE status = 'open';

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- orders: anon CRUD
DROP POLICY IF EXISTS "anon_select_orders" ON orders;
CREATE POLICY "anon_select_orders" ON orders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_orders" ON orders;
CREATE POLICY "anon_update_orders" ON orders FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_orders" ON orders;
CREATE POLICY "anon_delete_orders" ON orders FOR DELETE
  TO anon, authenticated USING (true);

-- order_items: anon CRUD
DROP POLICY IF EXISTS "anon_select_order_items" ON order_items;
CREATE POLICY "anon_select_order_items" ON order_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_order_items" ON order_items;
CREATE POLICY "anon_insert_order_items" ON order_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_order_items" ON order_items;
CREATE POLICY "anon_update_order_items" ON order_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_order_items" ON order_items;
CREATE POLICY "anon_delete_order_items" ON order_items FOR DELETE
  TO anon, authenticated USING (true);
