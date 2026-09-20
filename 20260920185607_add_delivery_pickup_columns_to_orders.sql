/*
# Add Delivery / Pickup support to orders

1. Modified Tables
- `orders`
  - Add `order_type` (text, CHECK in 'dine_in', 'delivery', 'pickup', default 'dine_in') — Tipo de orden: mesa, delivery o retirar.
  - Add `customer_phone` (text, nullable) — Teléfono del cliente (obligatorio para delivery/pickup).
  - Add `delivery_address` (text, nullable) — Dirección de entrega (obligatorio solo para delivery).
  - Make `table_id` nullable (was NOT NULL) — Delivery/pickup orders don't belong to a physical table.
  - Make `terrace_id` nullable (was NOT NULL) — Same reason.
  - Drop the partial unique index `idx_orders_open_per_table` and recreate it to only apply to dine_in orders, so delivery/pickup orders with null table_id don't conflict.

2. Security
- No new tables. Existing RLS policies already cover all columns (USING/WITH CHECK true for anon+authenticated).
- No policy changes needed.

3. Notes
- All new columns are nullable with safe defaults so existing orders and the dashboard/mesas flow are unaffected.
- `order_type` defaults to 'dine_in' so all existing orders automatically get the correct type.
- The unique index on open orders per table is recreated with an additional WHERE clause `order_type = 'dine_in'` so multiple external orders can coexist.
*/

-- Add new columns
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'dine_in'
    CHECK (order_type IN ('dine_in', 'delivery', 'pickup')),
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS delivery_address text;

-- Make table_id and terrace_id nullable for delivery/pickup orders
ALTER TABLE orders ALTER COLUMN table_id DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN terrace_id DROP NOT NULL;

-- Recreate the open-per-table unique index scoped to dine_in only
DROP INDEX IF EXISTS idx_orders_open_per_table;
CREATE UNIQUE INDEX idx_orders_open_per_table
  ON orders(table_id) WHERE status = 'open' AND order_type = 'dine_in';