-- Versioned, additive schema. Existing manually-created tables remain untouched.
PRAGMA foreign_keys = ON;
CREATE TABLE bp_resellers (
 id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
 credit_balance INTEGER NOT NULL DEFAULT 0 CHECK(credit_balance>=0),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE bp_panel_accounts (
 id TEXT PRIMARY KEY, access_identity TEXT NOT NULL UNIQUE,
 role TEXT NOT NULL CHECK(role IN ('super_admin','reseller')),
 reseller_id TEXT REFERENCES bp_resellers(id), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 CHECK((role='super_admin' AND reseller_id IS NULL) OR (role='reseller' AND reseller_id IS NOT NULL))
);
CREATE UNIQUE INDEX bp_one_owner ON bp_panel_accounts(role) WHERE role='super_admin';
CREATE INDEX bp_accounts_owner ON bp_panel_accounts(reseller_id);
CREATE TABLE bp_dns (
 id TEXT PRIMARY KEY, reseller_id TEXT NOT NULL REFERENCES bp_resellers(id),
 title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 100),
 server_url TEXT NOT NULL CHECK(length(server_url)<=1500), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX bp_dns_owner ON bp_dns(reseller_id,created_at);
CREATE TABLE bp_ads (
 id TEXT PRIMARY KEY, reseller_id TEXT NOT NULL REFERENCES bp_resellers(id),
 title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 100),
 mime_type TEXT NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp')),
 image BLOB NOT NULL, byte_size INTEGER NOT NULL CHECK(byte_size BETWEEN 1 AND 262144 AND length(image)=byte_size),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX bp_ads_owner ON bp_ads(reseller_id,created_at);
CREATE TABLE bp_storage (
 id INTEGER PRIMARY KEY CHECK(id=1), used_bytes INTEGER NOT NULL DEFAULT 0 CHECK(used_bytes BETWEEN 0 AND 134217728)
);
INSERT INTO bp_storage(id,used_bytes) VALUES(1,0);
CREATE TABLE bp_audit_events (
 id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, actor_role TEXT NOT NULL, reseller_id TEXT,
 action TEXT NOT NULL, target_id TEXT, details TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX bp_audit_owner ON bp_audit_events(reseller_id,created_at);
CREATE TABLE bp_products (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'TV',
 description TEXT NOT NULL DEFAULT '', icon TEXT NOT NULL DEFAULT '📺', image_url TEXT, download_url TEXT,
 published INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX bp_products_public ON bp_products(published,updated_at);
CREATE TRIGGER bp_dns_quota BEFORE INSERT ON bp_dns
 WHEN (SELECT COUNT(*) FROM bp_dns WHERE reseller_id=NEW.reseller_id)>=3
 BEGIN SELECT RAISE(ABORT,'quota_dns_3'); END;
CREATE TRIGGER bp_ads_quota BEFORE INSERT ON bp_ads
 WHEN (SELECT COUNT(*) FROM bp_ads WHERE reseller_id=NEW.reseller_id)>=8
 BEGIN SELECT RAISE(ABORT,'quota_ads_8'); END;
CREATE TRIGGER bp_ads_storage_insert AFTER INSERT ON bp_ads
 BEGIN UPDATE bp_storage SET used_bytes=used_bytes+NEW.byte_size WHERE id=1; END;
CREATE TRIGGER bp_ads_storage_delete AFTER DELETE ON bp_ads
 BEGIN UPDATE bp_storage SET used_bytes=used_bytes-OLD.byte_size WHERE id=1; END;
CREATE TRIGGER bp_ads_immutable BEFORE UPDATE ON bp_ads
 BEGIN SELECT RAISE(ABORT,'ads_immutable_delete_and_recreate'); END;
CREATE TRIGGER bp_dns_owner_immutable BEFORE UPDATE OF reseller_id ON bp_dns
 BEGIN SELECT RAISE(ABORT,'dns_owner_immutable'); END;
