-- HISTORICAL: not used by API 1.0. Use migrations/0001_boxpanel.sql after reviewed backup/import.
-- BOXPANEL: ADS/DNS tables with hard per-reseller quotas.
-- Safe to run after creating the existing resellers table.
-- This migration does not enable R2 or any paid storage.
CREATE TABLE IF NOT EXISTS reseller_dns (
 id TEXT PRIMARY KEY,
 reseller_id TEXT NOT NULL,
 title TEXT NOT NULL,
 server_url TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reseller_dns_owner ON reseller_dns(reseller_id);
CREATE TRIGGER IF NOT EXISTS dns_quota_insert BEFORE INSERT ON reseller_dns
WHEN (SELECT COUNT(*) FROM reseller_dns WHERE reseller_id=NEW.reseller_id)>=3
BEGIN SELECT RAISE(ABORT,'Maximum 3 DNS per reseller'); END;
CREATE TABLE IF NOT EXISTS reseller_ads (
 id TEXT PRIMARY KEY,
 reseller_id TEXT NOT NULL,
 title TEXT NOT NULL,
 storage_key TEXT,
 mime_type TEXT NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp')),
 byte_size INTEGER NOT NULL DEFAULT 0 CHECK(byte_size>=0 AND byte_size<=5242880),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reseller_ads_owner ON reseller_ads(reseller_id);
CREATE TRIGGER IF NOT EXISTS ads_quota_insert BEFORE INSERT ON reseller_ads
WHEN (SELECT COUNT(*) FROM reseller_ads WHERE reseller_id=NEW.reseller_id)>=8
BEGIN SELECT RAISE(ABORT,'Maximum 8 ads per reseller'); END;
-- Only store storage_key once a zero-auto-charge image backend is selected.
