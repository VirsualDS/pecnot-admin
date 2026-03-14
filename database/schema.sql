-- ============================================================
-- PECNOT LICENSING SYSTEM - DATABASE SCHEMA V1
-- Compatibile con PostgreSQL / Neon
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'license_status_enum') THEN
        CREATE TYPE license_status_enum AS ENUM (
            'active',
            'suspended',
            'expired'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_cycle_enum') THEN
        CREATE TYPE billing_cycle_enum AS ENUM (
            'monthly',
            'semiannual',
            'annual'
        );
    END IF;
END
$$;

-- ============================================================
-- ADMINS
-- Utenti amministratori del pannello admin
-- ============================================================

CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,

    full_name TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STUDIOS
-- Ogni studio = 1 cliente = 1 account condiviso
-- ============================================================

CREATE TABLE studios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    studio_name TEXT NOT NULL,

    login_email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,

    license_status license_status_enum NOT NULL DEFAULT 'active',

    billing_cycle billing_cycle_enum NOT NULL,

    license_starts_at TIMESTAMPTZ NOT NULL,
    license_expires_at TIMESTAMPTZ NOT NULL,

    notes TEXT,

    last_successful_check_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT license_dates_check
        CHECK (license_expires_at >= license_starts_at)
);

-- ============================================================
-- INSTALLATIONS
-- Traccia le macchine che usano PECNOT
-- NON blocca il numero di dispositivi nella V1
-- ============================================================

CREATE TABLE installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,

    machine_fingerprint TEXT NOT NULL,
    machine_name TEXT,
    os_name TEXT,
    app_version TEXT,

    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    last_ip INET,

    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT installation_unique_machine
        UNIQUE (studio_id, machine_fingerprint)
);

-- ============================================================
-- CLIENT SESSIONS
-- Token di sessione persistenti per login automatico
-- ============================================================

CREATE TABLE client_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,

    installation_id UUID REFERENCES installations(id) ON DELETE SET NULL,

    session_token_hash TEXT NOT NULL UNIQUE,

    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    expires_at TIMESTAMPTZ,

    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT EVENTS
-- Tracciamento eventi amministrativi e client
-- ============================================================

CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    studio_id UUID REFERENCES studios(id) ON DELETE SET NULL,
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,

    event_type TEXT NOT NULL,

    event_payload JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_admins_email
    ON admins(email);

CREATE INDEX idx_studios_login_email
    ON studios(login_email);

CREATE INDEX idx_studios_license_status
    ON studios(license_status);

CREATE INDEX idx_studios_license_expires_at
    ON studios(license_expires_at);

CREATE INDEX idx_installations_studio_id
    ON installations(studio_id);

CREATE INDEX idx_installations_last_seen_at
    ON installations(last_seen_at);

CREATE INDEX idx_client_sessions_studio_id
    ON client_sessions(studio_id);

CREATE INDEX idx_client_sessions_installation_id
    ON client_sessions(installation_id);

CREATE INDEX idx_client_sessions_last_validated_at
    ON client_sessions(last_validated_at);

CREATE INDEX idx_audit_events_studio_id
    ON audit_events(studio_id);

CREATE INDEX idx_audit_events_admin_id
    ON audit_events(admin_id);

CREATE INDEX idx_audit_events_event_type
    ON audit_events(event_type);

CREATE INDEX idx_audit_events_created_at
    ON audit_events(created_at);

-- ============================================================
-- UPDATED_AT TRIGGER
-- aggiorna automaticamente updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_admins_updated_at
BEFORE UPDATE ON admins
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_studios_updated_at
BEFORE UPDATE ON studios
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_installations_updated_at
BEFORE UPDATE ON installations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_client_sessions_updated_at
BEFORE UPDATE ON client_sessions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();