-- Run after schema-v2.sql. Enforce reseller quotas at the database layer.
CREATE TABLE IF NOT EXISTS reseller_ads (
 id TEXT PRIMARY KEY,
 reseller_id TEXT NOT NULL REFERENCES resellers(id),
 title TEXT NOT NULL DEFAULT '',
 r2_object_key TEXT NOT NULL,
 mime_type TEXT NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reseller_ads ON reseller_ads(reseller_id,created_at);
CREATE TABLE IF NOT EXISTS reseller_dns (
 id TEXT PRIMARY KEY,
 reseller_id TEXT NOT NULL REFERENCES resellers(id),
 title TEXT NOT NULL DEFAULT '',
 server_url TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reseller_dns ON reseller_dns(reseller_id);
CREATE TRIGGER IF NOT EXISTS reseller_ads_limit BEFORE INSERT ON reseller_ads
WHEN (SELECT COUNT(*) FROM reseller_ads WHERE reseller_id=NEW.reseller_id)>=8
BEGIN SELECT RAISE(ABORT,'Reseller limit: 8 images'); END;
CREATE TRIGGER IF NOT EXISTS reseller_dns_limit BEFORE INSERT ON reseller_dns
WHEN (SELECT COUNT(*) FROM reseller_dns WHERE reseller_id=NEW.reseller_id)>=3
BEGIN SELECT RAISE(ABORT,'Reseller limit: 3 DNS'); END;
-- Reseller ownership must be derived from verified identity in the Worker, never from request JSON.
