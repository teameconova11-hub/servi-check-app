/*
# Add updated_at column to payment_accounts

1. Modified Tables
- `payment_accounts`
  - Add `updated_at` (timestamptz, default now()) column that was missing from the original migration.
  - The trigger `trigger_payment_accounts_updated_at` already exists and references this column; it was failing silently because the column didn't exist.
2. Notes
- This is a non-destructive ADD COLUMN. No data is lost.
- The column is nullable with a default of now() so existing rows get a value automatically.
*/

ALTER TABLE payment_accounts
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();