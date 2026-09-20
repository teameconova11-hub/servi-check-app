/*
# Add financial columns to orders

1. Modified Tables
- `orders`
  - Add `payment_currency` (text, CHECK in 'USD', 'VES') — Moneda en que se cobró el pedido.
  - Add `exchange_rate` (numeric, nullable) — Tasa de cambio del día si se cobró en VES.
  - Add `amount_paid` (numeric, nullable) — Monto final pagado en la moneda seleccionada.
  - Add `payment_account_id` (uuid, nullable, FK to payment_accounts.id) — Cuenta de destino del pago.
2. Security
- No policy changes needed; existing order policies already cover these new columns.
3. Notes
- All new columns are nullable so existing orders are not affected.
- payment_account_id has ON DELETE SET NULL so deleting a payment account doesn't break old orders.
*/

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_currency text CHECK (payment_currency IN ('USD', 'VES')),
ADD COLUMN IF NOT EXISTS exchange_rate numeric(12,2),
ADD COLUMN IF NOT EXISTS amount_paid numeric(12,2),
ADD COLUMN IF NOT EXISTS payment_account_id uuid;

-- FK to payment_accounts (ON DELETE SET NULL to preserve historical orders)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_payment_account_id_fkey'
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders
    ADD CONSTRAINT orders_payment_account_id_fkey
    FOREIGN KEY (payment_account_id) REFERENCES payment_accounts(id)
    ON DELETE SET NULL;
  END IF;
END $$;