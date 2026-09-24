CREATE TABLE IF NOT EXISTS profiles (
  username TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  pin_scheme TEXT NOT NULL,
  pin_iterations INTEGER NOT NULL,
  pin_salt TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  revision INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  holdings_json TEXT NOT NULL,
  realized_json TEXT NOT NULL,
  ops_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at);
