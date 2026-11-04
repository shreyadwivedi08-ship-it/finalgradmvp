/*
# Create sips table (single-tenant, no auth)

1. New Tables
- `sips`
  - `id` (text, primary key) — short identifier like 'ppfas', 'nippon'
  - `name` (text, not null) — mutual fund display name
  - `category` (text, not null) — e.g. "Direct • Growth • Equity"
  - `amount` (integer, not null) — monthly SIP amount in INR
  - `next_debit` (text, not null) — human-readable next debit date
  - `days_left` (integer, not null) — days until next debit
  - `streak_months` (integer, not null) — consecutive months invested
  - `total_invested` (integer, not null) — cumulative invested amount
  - `current_value` (integer, not null) — current portfolio value
  - `returns` (text, not null) — returns percentage string like "+12.1%"
  - `status` (text, not null) — 'Active', 'Snoozed (Nov Skipped)', 'Cancelled Permanently'
  - `skipped_month` (text, nullable) — month that was skipped, if any
  - `logo_bg` (text, not null) — Tailwind bg class for logo
  - `logo_text` (text, not null) — 2-letter logo abbreviation
  - `updated_at` (timestamptz, default now())

2. Security
- Enable RLS on `sips`.
- Grant CRUD to `anon` + `authenticated` so the Data API can reach the table.
- Allow anon + authenticated full CRUD because this is a single-tenant demo with no sign-in.

3. Seed Data
- Two initial SIPs: Parag Parikh Flexi Cap Fund and Nippon India Small Cap Fund.
*/

CREATE TABLE IF NOT EXISTS sips (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  amount integer NOT NULL,
  next_debit text NOT NULL,
  days_left integer NOT NULL,
  streak_months integer NOT NULL,
  total_invested integer NOT NULL,
  current_value integer NOT NULL,
  returns text NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  skipped_month text,
  logo_bg text NOT NULL,
  logo_text text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sips ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON sips TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_sips" ON sips;
CREATE POLICY "anon_select_sips" ON sips FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sips" ON sips;
CREATE POLICY "anon_insert_sips" ON sips FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sips" ON sips;
CREATE POLICY "anon_update_sips" ON sips FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sips" ON sips;
CREATE POLICY "anon_delete_sips" ON sips FOR DELETE
  TO anon, authenticated USING (true);

INSERT INTO sips (id, name, category, amount, next_debit, days_left, streak_months, total_invested, current_value, returns, status, skipped_month, logo_bg, logo_text)
VALUES
  ('ppfas', 'Parag Parikh Flexi Cap Fund', 'Direct • Growth • Equity', 5000, '10 Nov 2026', 7, 8, 40000, 44850, '+12.1%', 'Active', NULL, 'bg-emerald-600', 'PP'),
  ('nippon', 'Nippon India Small Cap Fund', 'Direct • Growth • Equity', 2000, '14 Nov 2026', 11, 5, 10000, 11120, '+11.2%', 'Active', NULL, 'bg-blue-600', 'NI')
ON CONFLICT (id) DO NOTHING;
