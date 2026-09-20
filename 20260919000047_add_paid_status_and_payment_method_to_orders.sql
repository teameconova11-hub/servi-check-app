/*
# Add 'paid' status and payment_method to orders

1. Modified Tables
- `orders`
  - Extend status CHECK constraint to include 'paid' (was: 'open', 'sent', 'completed')
  - Add `payment_method` (text, nullable) — stores the method used when the order is paid
    (e.g. 'cash', 'card', 'zelle')
  - Add `paid_at` (timestamptz, nullable) — timestamp of when payment was processed

2. Security
- No policy changes needed; existing anon CRUD policies already cover UPDATE.

3. Notes
- The status CHECK is replaced via DROP CONSTRAINT + ADD CONSTRAINT (non-destructive; no data is lost).
- payment_method and paid_at are nullable so existing rows are unaffected.
- When an order is marked 'paid', the app also sets the table_group to 'closed' if applicable,
  and the table becomes free for new customers (the order simply stops appearing in fetchOpenOrders
  which filters status IN ('open','sent')).
*/

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('open', 'sent', 'completed', 'paid'));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;