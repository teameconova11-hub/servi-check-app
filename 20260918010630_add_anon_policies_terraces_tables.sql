/*
# Add anon-accessible CRUD policies on terraces and tables

1. Security changes
- `terraces`: currently only admin role can do anything. The app has no sign-in screen, so the anon-key client gets zero rows. Add per-verb policies for anon+authenticated so the panel can read/write terraces.
- `tables`: same situation — admin-only ALL policy blocks anon. Add per-verb policies for anon+authenticated.
- Existing admin policies are kept (they are permissive, so multiple policies coexist).

2. Notes
- Single-tenant app, no auth: data is intentionally shared, so `USING (true)` / `WITH CHECK (true)` is correct.
- Drop-first pattern for idempotency.
*/

-- terraces: anon CRUD
DROP POLICY IF EXISTS "anon_select_terraces" ON terraces;
CREATE POLICY "anon_select_terraces" ON terraces FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_terraces" ON terraces;
CREATE POLICY "anon_insert_terraces" ON terraces FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_terraces" ON terraces;
CREATE POLICY "anon_update_terraces" ON terraces FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_terraces" ON terraces;
CREATE POLICY "anon_delete_terraces" ON terraces FOR DELETE
  TO anon, authenticated USING (true);

-- tables: anon CRUD
DROP POLICY IF EXISTS "anon_select_tables" ON tables;
CREATE POLICY "anon_select_tables" ON tables FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_tables" ON tables;
CREATE POLICY "anon_insert_tables" ON tables FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_tables" ON tables;
CREATE POLICY "anon_update_tables" ON tables FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_tables" ON tables;
CREATE POLICY "anon_delete_tables" ON tables FOR DELETE
  TO anon, authenticated USING (true);
