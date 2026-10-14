
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT,
  lang TEXT DEFAULT 'en',
  coins INTEGER DEFAULT 100,
  ton_earned REAL DEFAULT 0,
  last_farm_time INTEGER DEFAULT 0,
  protection_until INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS plots (
  user_id INTEGER,
  plot_id INTEGER,
  crop TEXT,
  planted_at INTEGER,
  PRIMARY KEY (user_id, plot_id)
);
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_en TEXT,
  title_ar TEXT,
  link TEXT,
  reward REAL,
  type TEXT
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
INSERT OR IGNORE INTO settings(key,value) VALUES ('a_ads_enabled','true');
INSERT OR IGNORE INTO settings(key,value) VALUES ('adsgram_block_id','YOUR_ADSGRAM_BLOCK_ID');
INSERT OR IGNORE INTO settings(key,value) VALUES ('a_ads_id','YOUR_A-ADS_ID');
INSERT OR IGNORE INTO settings(key,value) VALUES ('owner_wallet','UQA7QBgeXOQldcirB1fWYLr8SRF-3ZVpZliYVNcWp-hmqx4R');
