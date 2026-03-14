-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('active', 'suspended', 'expired');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'semiannual', 'annual');

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studios" (
    "id" UUID NOT NULL,
    "studio_name" TEXT NOT NULL,
    "login_email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "license_status" "LicenseStatus" NOT NULL DEFAULT 'active',
    "billing_cycle" "BillingCycle" NOT NULL,
    "license_starts_at" TIMESTAMPTZ(6) NOT NULL,
    "license_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "notes" TEXT,
    "last_successful_check_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "studios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installations" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "machine_fingerprint" TEXT NOT NULL,
    "machine_name" TEXT,
    "os_name" TEXT,
    "app_version" TEXT,
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_ip" TEXT,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_sessions" (
    "id" UUID NOT NULL,
    "studio_id" UUID NOT NULL,
    "installation_id" UUID,
    "session_token_hash" TEXT NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_validated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "client_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "studio_id" UUID,
    "admin_id" UUID,
    "event_type" TEXT NOT NULL,
    "event_payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "studios_login_email_key" ON "studios"("login_email");

-- CreateIndex
CREATE INDEX "idx_installations_studio_id" ON "installations"("studio_id");

-- CreateIndex
CREATE INDEX "idx_installations_last_seen_at" ON "installations"("last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "installations_studio_id_machine_fingerprint_key" ON "installations"("studio_id", "machine_fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "client_sessions_session_token_hash_key" ON "client_sessions"("session_token_hash");

-- CreateIndex
CREATE INDEX "idx_client_sessions_studio_id" ON "client_sessions"("studio_id");

-- CreateIndex
CREATE INDEX "idx_client_sessions_installation_id" ON "client_sessions"("installation_id");

-- CreateIndex
CREATE INDEX "idx_client_sessions_last_validated_at" ON "client_sessions"("last_validated_at");

-- CreateIndex
CREATE INDEX "idx_audit_events_studio_id" ON "audit_events"("studio_id");

-- CreateIndex
CREATE INDEX "idx_audit_events_admin_id" ON "audit_events"("admin_id");

-- CreateIndex
CREATE INDEX "idx_audit_events_event_type" ON "audit_events"("event_type");

-- CreateIndex
CREATE INDEX "idx_audit_events_created_at" ON "audit_events"("created_at");

-- AddForeignKey
ALTER TABLE "installations" ADD CONSTRAINT "installations_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_sessions" ADD CONSTRAINT "client_sessions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_sessions" ADD CONSTRAINT "client_sessions_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "installations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
