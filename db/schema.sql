-- Existing reports table (keep as-is)
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  confirmed_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  status TEXT DEFAULT 'active'
);

-- New: users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- New: user preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  user_type TEXT,
  mobility_aid TEXT,
  slope_pref TEXT DEFAULT 'any',
  sheltered INTEGER DEFAULT 0,
  rest_stops INTEGER DEFAULT 0,
  washroom_access INTEGER DEFAULT 0,
  washroom_freq TEXT DEFAULT '500',
  home_lat REAL,
  home_lng REAL,
  home_label TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- New: saved locations/bookmarks
CREATE TABLE IF NOT EXISTS saved_locations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  label TEXT NOT NULL,
  address TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  icon TEXT DEFAULT 'bookmark',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- New: route history
CREATE TABLE IF NOT EXISTS route_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  origin_label TEXT,
  dest_label TEXT,
  origin_lat REAL,
  origin_lng REAL,
  dest_lat REAL,
  dest_lng REAL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);