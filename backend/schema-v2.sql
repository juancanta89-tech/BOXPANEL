-- BOXPANEL multi-tenant migration. Apply only after reviewing existing production data.
CREATE TABLE IF NOT EXISTS resellers (
 id TEXT PRIMARY KEY,
 username TEXT NOT NULL UNIQUE,
 display_name TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
 credit_balance INTEGER NOT NULL DEFAULT 0 CHECK(credit_balance>=0),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS reseller_apps (
 id TEXT PRIMARY KEY,
 reseller_id TEXT NOT NULL REFERENCES resellers(id),
 app_name TEXT NOT NULL,
 logo_url TEXT,
 package_id TEXT,
 version TEXT,
 download_url TEXT,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','suspended')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_apps_reseller ON reseller_apps(reseller_id);
CREATE TABLE IF NOT EXISTS reseller_clients (
 id TEXT PRIMARY KEY,
 reseller_id TEXT NOT NULL REFERENCES resellers(id),
 external_client_id TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended')),
 expires_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(reseller_id,external_client_id)
);
CREATE INDEX IF NOT EXISTS idx_clients_reseller ON reseller_clients(reseller_id);
CREATE TABLE IF NOT EXISTS credit_transactions (
 id TEXT PRIMARY KEY,
 reseller_id TEXT NOT NULL REFERENCES resellers(id),
 delta INTEGER NOT NULL,
 balance_after INTEGER NOT NULL CHECK(balance_after>=0),
 operation TEXT NOT NULL CHECK(operation IN ('grant','consume','refund','adjust')),
 actor_id TEXT NOT NULL,
 client_id TEXT,
 note TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_credits_reseller ON credit_transactions(reseller_id,created_at);
CREATE TABLE IF NOT EXISTS audit_events (
 id TEXT PRIMARY KEY,
 actor_id TEXT NOT NULL,
 actor_role TEXT NOT NULL,
 reseller_id TEXT,
 action TEXT NOT NULL,
 target_id TEXT,
 details TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_reseller ON audit_events(reseller_id,created_at);
CREATE TABLE IF NOT EXISTS panel_accounts (
 id TEXT PRIMARY KEY,
 access_identity TEXT NOT NULL UNIQUE,
 role TEXT NOT NULL CHECK(role IN ('super_admin','reseller')),
 reseller_id TEXT REFERENCES resellers(id),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 CHECK ((role='super_admin' AND reseller_id IS NULL) OR (role='reseller' AND reseller_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_accounts_reseller ON panel_accounts(reseller_id);
