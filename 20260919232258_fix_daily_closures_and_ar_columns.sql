-- Add missing columns to daily_closures that the code expects
ALTER TABLE daily_closures ADD COLUMN IF NOT EXISTS accounts_breakdown jsonb;
ALTER TABLE daily_closures ADD COLUMN IF NOT EXISTS closed_by text;

-- Ensure RLS policies allow authenticated users full access
ALTER TABLE daily_closures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en daily_closures" ON daily_closures;
CREATE POLICY "Permitir todo en daily_closures" ON daily_closures
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ensure accounts_receivable has proper policies
ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir todo en accounts_receivable" ON accounts_receivable;
CREATE POLICY "Permitir todo en accounts_receivable" ON accounts_receivable
  FOR ALL TO authenticated USING (true) WITH CHECK (true);