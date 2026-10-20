-- HISTORICAL: not used by API 1.0. Use migrations/0001_boxpanel.sql after reviewed backup/import.
CREATE TABLE IF NOT EXISTS products (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 category TEXT NOT NULL DEFAULT 'TV',
 description TEXT NOT NULL DEFAULT '',
 icon TEXT NOT NULL DEFAULT '📺',
 image_url TEXT,
 download_url TEXT,
 published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_published ON products(published);
