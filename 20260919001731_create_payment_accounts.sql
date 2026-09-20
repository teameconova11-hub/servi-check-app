/*
# Create payment_accounts table

1. New Tables
- `payment_accounts`
  - `id` (uuid, primary key, default gen_random_uuid())
  - `name` (text, not null) — Nombre de la cuenta (ej. "Banco de Venezuela", "Pago Móvil", "Zelle")
  - `currency` (text, not null, CHECK in 'USD', 'VES') — Moneda de la cuenta
  - `details` (text, not null default '') — Número de cuenta, referencia o teléfono
  - `is_active` (boolean, default true) — Permite desactivar cuentas sin borrarlas
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())
2. Security
- Enable RLS on `payment_accounts`.
- Admin-only access: all CRUD scoped to authenticated users with role 'admin' in profiles.
- Uses a subquery to check profiles.role = 'admin' for the current auth.uid().
3. Notes
- Multiple rows allowed — each row is one financial account.
- is_active lets the admin deactivate accounts without data loss.
*/

CREATE TABLE IF NOT EXISTS payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  currency text NOT NULL CHECK (currency IN ('USD', 'VES')),
  details text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_payment_accounts" ON payment_accounts;
CREATE POLICY "admin_read_payment_accounts"
ON payment_accounts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "admin_insert_payment_accounts" ON payment_accounts;
CREATE POLICY "admin_insert_payment_accounts"
ON payment_accounts FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "admin_update_payment_accounts" ON payment_accounts;
CREATE POLICY "admin_update_payment_accounts"
ON payment_accounts FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "admin_delete_payment_accounts" ON payment_accounts;
CREATE POLICY "admin_delete_payment_accounts"
ON payment_accounts FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_payment_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payment_accounts_updated_at ON payment_accounts;
CREATE TRIGGER trigger_payment_accounts_updated_at
BEFORE UPDATE ON payment_accounts
FOR EACH ROW
EXECUTE FUNCTION update_payment_accounts_updated_at();