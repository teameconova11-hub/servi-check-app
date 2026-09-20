/*
# Add discount columns to orders

1. Modified Tables
- `orders`
  - Add `discount_percentage` (numeric(5,2), default 0) — Porcentaje de descuento aplicado al pedido.
  - Add `final_amount` (numeric(12,2), nullable) — Total final después del descuento (base para cobrar).
2. Notes
- Both columns are nullable/defaulted so existing orders are not affected.
*/

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS discount_percentage numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_amount numeric(12,2);