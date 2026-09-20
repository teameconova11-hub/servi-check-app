/*
# Clean up conflicting RLS policies on payment_accounts

1. Security Changes
- Drop the legacy "Permitir gestion de cuentas solo a admin" (FOR ALL, using true) policy that was allowing unrestricted access.
- Drop the legacy "Permitir lectura de cuentas a usuarios autenticados" (SELECT, using true) policy.
- Keep only the admin-scoped policies (read/insert/update/delete) that check profiles.role = 'admin'.
2. Notes
- No data is lost. Only policy definitions change.
- After this, only authenticated users with role='admin' in profiles can CRUD payment_accounts.
*/

DROP POLICY IF EXISTS "Permitir gestion de cuentas solo a admin" ON payment_accounts;
DROP POLICY IF EXISTS "Permitir lectura de cuentas a usuarios autenticados" ON payment_accounts;