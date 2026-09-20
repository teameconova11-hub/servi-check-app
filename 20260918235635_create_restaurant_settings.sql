/*
# Create restaurant_settings table

1. New Tables
- `restaurant_settings`
  - `id` (uuid, primary key, default gen_random_uuid())
  - `name` (text, not null) — Nombre del restaurante
  - `rif` (text, not null) — RIF (Registro de Información Fiscal)
  - `phone` (text, not null) — Teléfono de contacto
  - `address` (text, not null) — Dirección fiscal
  - `updated_at` (timestamptz, default now()) — Última actualización
2. Security
- Enable RLS on `restaurant_settings`.
- Admin-only access: all CRUD scoped to authenticated users with role 'admin' in profiles.
- Uses a subquery to check profiles.role = 'admin' for the current auth.uid().
3. Notes
- Single-row design: the app upserts one row and reads it via maybeSingle().
- No user_id column needed since access is role-based, not ownership-based.
*/

CREATE TABLE IF NOT EXISTS restaurant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  rif text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_restaurant_settings" ON restaurant_settings;
CREATE POLICY "admin_read_restaurant_settings"
ON restaurant_settings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "admin_insert_restaurant_settings" ON restaurant_settings;
CREATE POLICY "admin_insert_restaurant_settings"
ON restaurant_settings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

DROP POLICY IF EXISTS "admin_update_restaurant_settings" ON restaurant_settings;
CREATE POLICY "admin_update_restaurant_settings"
ON restaurant_settings FOR UPDATE
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

DROP POLICY IF EXISTS "admin_delete_restaurant_settings" ON restaurant_settings;
CREATE POLICY "admin_delete_restaurant_settings"
ON restaurant_settings FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_restaurant_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_restaurant_settings_updated_at ON restaurant_settings;
CREATE TRIGGER trigger_restaurant_settings_updated_at
BEFORE UPDATE ON restaurant_settings
FOR EACH ROW
EXECUTE FUNCTION update_restaurant_settings_updated_at();