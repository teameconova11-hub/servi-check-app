/*
# Create daily_closures table

1. New Tables
- `daily_closures`
  - Stores frozen daily totals when admin closes the day.
  - Columns:
    - `id` (uuid PK)
    - `closure_date` (date, NOT NULL, UNIQUE)
    - `total_usd` (numeric(12,2), default 0)
    - `total_ves` (numeric(14,2), default 0)
    - `total_diners` (int, default 0)
    - `total_orders` (int, default 0)
    - `accounts_breakdown` (jsonb, nullable — per-account USD/VES totals)
    - `closed_by` (text, nullable — user email)
    - `created_at` (timestamptz, default now())

2. Notes
- RLS enabled with 4 CRUD policies for authenticated role.
*/

CREATE TABLE IF NOT EXISTS daily_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  closure_date date NOT NULL UNIQUE,
  total_usd numeric(12,2) DEFAULT 0,
  total_ves numeric(14,2) DEFAULT 0,
  total_diners int DEFAULT 0,
  total_orders int DEFAULT 0,
  accounts_breakdown jsonb,
  closed_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE daily_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_dc" ON daily_closures FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_dc" ON daily_closures FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_dc" ON daily_closures FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_dc" ON daily_closures FOR DELETE
  TO authenticated USING (true);