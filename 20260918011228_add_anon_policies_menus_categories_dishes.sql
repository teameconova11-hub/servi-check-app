/*
# Add anon-accessible CRUD policies on menus, categories, and dishes

1. Security changes
- `menus`: currently only admin role can write; anon can only SELECT active menus. Add per-verb policies for anon+authenticated so the panel can read/write all menus.
- `categories`: currently only admin can write; anon can only SELECT. Add per-verb policies for anon+authenticated.
- `dishes`: currently only admin can write; anon can only SELECT available dishes. Add per-verb policies for anon+authenticated.
- Existing admin policies are kept (they are permissive, so multiple policies coexist).

2. Notes
- Single-tenant app, no auth: data is intentionally shared, so `USING (true)` / `WITH CHECK (true)` is correct.
- Drop-first pattern for idempotency.
*/

-- menus: anon CRUD
DROP POLICY IF EXISTS "anon_select_menus" ON menus;
CREATE POLICY "anon_select_menus" ON menus FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_menus" ON menus;
CREATE POLICY "anon_insert_menus" ON menus FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_menus" ON menus;
CREATE POLICY "anon_update_menus" ON menus FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_menus" ON menus;
CREATE POLICY "anon_delete_menus" ON menus FOR DELETE
  TO anon, authenticated USING (true);

-- categories: anon CRUD
DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_categories" ON categories;
CREATE POLICY "anon_update_categories" ON categories FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
CREATE POLICY "anon_delete_categories" ON categories FOR DELETE
  TO anon, authenticated USING (true);

-- dishes: anon CRUD
DROP POLICY IF EXISTS "anon_select_dishes" ON dishes;
CREATE POLICY "anon_select_dishes" ON dishes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_dishes" ON dishes;
CREATE POLICY "anon_insert_dishes" ON dishes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_dishes" ON dishes;
CREATE POLICY "anon_update_dishes" ON dishes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_dishes" ON dishes;
CREATE POLICY "anon_delete_dishes" ON dishes FOR DELETE
  TO anon, authenticated USING (true);
