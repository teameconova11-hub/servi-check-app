/*
# Add SELECT policy on profiles for authenticated users

1. Security changes
- `profiles`: currently has RLS enabled but NO policies, meaning no role can read or write. Add a SELECT policy so authenticated users can read their own profile row (needed to determine role after login).
- The `profiles` table has `id` referencing `auth.users.id`, so `auth.uid() = id` is the correct ownership check.

2. Notes
- Only the owner can read their own profile — no cross-user access.
- Drop-first pattern for idempotency.
*/

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
