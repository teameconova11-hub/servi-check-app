/*
# Create accounts_receivable table

1. Modified Tables
- (none)

2. New Tables
- `accounts_receivable`
  - Tracks credit sales (ventas a crédito) where the customer owes the restaurant.
  - Columns:
    - `id` (uuid PK, default gen_random_uuid())
    - `order_id` (uuid FK → orders.id, ON DELETE CASCADE)
    - `customer_name` (text, NOT NULL)
    - `table_number` (text, nullable — snapshot of table number at time of credit)
    - `amount` (numeric(12,2), NOT NULL) — total pending (final_amount after discount)
    - `status` (text, default 'pending', CHECK in pending/paid/cancelled)
    - `created_at` (timestamptz, default now())
    - `paid_at` (timestamptz, nullable)

3. Notes
- RLS enabled with 4 CRUD policies for authenticated role.
*/

CREATE TABLE IF NOT EXISTS accounts_receivable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  table_number text,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_ar" ON accounts_receivable FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_own_ar" ON accounts_receivable FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_ar" ON accounts_receivable FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_ar" ON accounts_receivable FOR DELETE
  TO authenticated USING (true);