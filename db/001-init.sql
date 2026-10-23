CREATE TABLE IF NOT EXISTS participations (
 id UUID PRIMARY KEY,
 token_hash TEXT UNIQUE NOT NULL,
 request_hash TEXT NOT NULL,
 name VARCHAR(80) NOT NULL,
 age_band TEXT CHECK (age_band IN ('18-24','25-34','35-44','45-59','60+')),
 profile JSONB NOT NULL,
 recommendations JSONB NOT NULL,
 catalog_version TEXT NOT NULL,
 consent_version TEXT NOT NULL,
 adult_confirmed BOOLEAN NOT NULL CHECK(adult_confirmed),
 mode TEXT NOT NULL CHECK (mode IN ('test','real')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 expires_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '90 days')
);
CREATE TABLE IF NOT EXISTS feedback (
 participation_id UUID PRIMARY KEY REFERENCES participations(id) ON DELETE CASCADE,
 fit TEXT NOT NULL CHECK (fit IN ('sim','parte','nao')),
 comment VARCHAR(1500) NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS clicks (
 event_id UUID PRIMARY KEY,
 participation_id UUID NOT NULL REFERENCES participations(id) ON DELETE CASCADE,
 course_id TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS clicks_participation ON clicks(participation_id);
CREATE INDEX IF NOT EXISTS participations_expiry ON participations(expires_at);
CREATE TABLE IF NOT EXISTS admin_sessions (
 token_hash TEXT PRIMARY KEY,
 expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_limits (
 key TEXT PRIMARY KEY,
 hits INTEGER NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL
);
