/*
# Create table_groups table for joining/merging tables

1. New Tables
- `table_groups`: stores temporary groups of merged tables for large parties. Columns:
  - id (uuid, primary key)
  - leader_table_id (uuid, FK to tables.id) — the primary/leader table of the group
  - customer_name (text) — name of the customer leading the reservation
  - party_size (integer) — total diners across all tables in the group
  - status (text, check: 'active' | 'closed') — lifecycle of the group
  - created_at (timestamptz)

- `table_group_members`: junction table linking tables to a group. Columns:
  - id (uuid, primary key)
  - group_id (uuid, FK to table_groups.id ON DELETE CASCADE)
  - table_id (uuid, FK to tables.id ON DELETE CASCADE)
  - created_at (timestamptz)

2. Security
- Enable RLS on both tables.
- Add per-verb CRUD policies for anon + authenticated (single-tenant app, data is intentionally shared).

3. Notes
- When a group is created, all member tables share a single order (created on the leader table).
- When the group is closed, all member tables return to individual/free status.
- The unique index on table_id in table_group_members ensures a table can only belong to one active group at a time.
*/

CREATE TABLE IF NOT EXISTS table_groups (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  leader_table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  party_size integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS table_group_members (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  group_id uuid NOT NULL REFERENCES table_groups(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_table_group_members_group_id ON table_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_table_group_members_table_id ON table_group_members(table_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_table_group_members_unique_table ON table_group_members(table_id);

ALTER TABLE table_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_group_members ENABLE ROW LEVEL SECURITY;

-- table_groups: anon CRUD
DROP POLICY IF EXISTS "anon_select_table_groups" ON table_groups;
CREATE POLICY "anon_select_table_groups" ON table_groups FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_table_groups" ON table_groups;
CREATE POLICY "anon_insert_table_groups" ON table_groups FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_table_groups" ON table_groups;
CREATE POLICY "anon_update_table_groups" ON table_groups FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_table_groups" ON table_groups;
CREATE POLICY "anon_delete_table_groups" ON table_groups FOR DELETE
  TO anon, authenticated USING (true);

-- table_group_members: anon CRUD
DROP POLICY IF EXISTS "anon_select_table_group_members" ON table_group_members;
CREATE POLICY "anon_select_table_group_members" ON table_group_members FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_table_group_members" ON table_group_members;
CREATE POLICY "anon_insert_table_group_members" ON table_group_members FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_table_group_members" ON table_group_members;
CREATE POLICY "anon_update_table_group_members" ON table_group_members FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_table_group_members" ON table_group_members;
CREATE POLICY "anon_delete_table_group_members" ON table_group_members FOR DELETE
  TO anon, authenticated USING (true);
