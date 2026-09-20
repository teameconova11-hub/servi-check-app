/*
# Create order_payments table for split / mixed payments

## Purpose
Allows a single order to be paid with multiple payment lines (abonos).
Each line records: currency (USD/VES), payment method, destination payment account,
amount in the payment currency, and the exchange rate used (if VES).

## New Table: order_payments
- `id` (uuid, primary key)
- `order_id` (uuid, FK to orders.id ON DELETE CASCADE)
- `currency` (text, 'USD' or 'VES')
- `payment_method` (text, e.g. 'cash', 'transfer', 'card', 'zelle', 'pago_movil', 'binance', 'tarjeta')
- `payment_account_id` (uuid, FK to payment_accounts.id, nullable for credit lines)
- `amount` (numeric, amount paid in the line's currency)
- `amount_usd` (numeric, the USD-equivalent of this line, for dashboard aggregation)
- `exchange_rate` (numeric, nullable — the rate used when currency=VES)
- `created_at` (timestamptz, default now())

## Security
- RLS enabled on order_payments.
- Anon + authenticated CRUD (same pattern as orders table — single-tenant POS app).

## Notes
- The orders table retains its existing payment columns for backward compatibility.
  For split payments, `orders.payment_method` is set to 'split' and `orders.amount_paid`
  stores the total USD equivalent. The individual lines live in order_payments.
- The Dashboard reads order_payments to build per-account totals.
*/

CREATE TABLE IF NOT EXISTS order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'USD',
  payment_method text NOT NULL,
  payment_account_id uuid REFERENCES payment_accounts(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  amount_usd numeric NOT NULL DEFAULT 0,
  exchange_rate numeric,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_payments_order_id ON order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_account_id ON order_payments(payment_account_id);

ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_order_payments" ON order_payments;
CREATE POLICY "anon_select_order_payments" ON order_payments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_order_payments" ON order_payments;
CREATE POLICY "anon_insert_order_payments" ON order_payments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_order_payments" ON order_payments;
CREATE POLICY "anon_update_order_payments" ON order_payments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_order_payments" ON order_payments;
CREATE POLICY "anon_delete_order_payments" ON order_payments FOR DELETE
  TO anon, authenticated USING (true);