-- ==============================================================================
-- IFC ACADEMY (KING FU ACADEMY) - SUPABASE POSTGRESQL PRODUCTION SCHEMA
-- Fully compatible with UUID primary keys & correct foreign key data types
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ADMINS TABLE (Secure credentials & RBAC)
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Super Admin' CHECK (role IN ('Super Admin', 'Admin', 'Coach', 'Accountant')),
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  "lastLoginAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PLAYERS TABLE (UUID Primary Key)
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "fullName" TEXT NOT NULL,
  "membershipCode" TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  "birthDate" DATE NOT NULL,
  age INTEGER NOT NULL,
  "group" TEXT NOT NULL CHECK ("group" IN ('براعم', 'ناشئين', 'شباب')),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  "nationalId" TEXT,
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PARENTS TABLE (UUID Foreign Key referencing players.id)
CREATE TABLE IF NOT EXISTS public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "playerId" UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  "parentName" TEXT NOT NULL,
  "parentPhone" TEXT NOT NULL,
  relationship TEXT NOT NULL,
  "emergencyPhone" TEXT
);

-- 4. SUBSCRIPTIONS TABLE (UUID Foreign Key referencing players.id)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "playerId" UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  "planName" TEXT NOT NULL DEFAULT 'اشتراك شهري',
  value NUMERIC NOT NULL DEFAULT 500,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Paid', 'Unpaid', 'ExpiringSoon', 'Expired')),
  "lastPaymentDate" DATE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PAYMENTS TABLE (UUID Foreign Keys referencing players.id and subscriptions.id)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "playerId" UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  "subscriptionId" UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  "paymentMethod" TEXT NOT NULL CHECK ("paymentMethod" IN ('Cash', 'Wallet', 'InstaPay')),
  "paidBy" TEXT NOT NULL DEFAULT 'ولي الأمر',
  "paymentDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Paid',
  "receiptNumber" TEXT NOT NULL,
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ATTENDANCE TABLE (UUID Foreign Key referencing players.id)
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "playerId" UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  "group" TEXT NOT NULL CHECK ("group" IN ('براعم', 'ناشئين', 'شباب')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('Present', 'Absent')),
  notes TEXT,
  "markedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("playerId", date)
);

-- 7. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY DEFAULT 'academy_settings',
  "academyName" TEXT NOT NULL DEFAULT 'IFC ACADEMY',
  phone TEXT,
  address TEXT,
  currency TEXT NOT NULL DEFAULT 'EGP',
  "defaultMonthlyFee" NUMERIC NOT NULL DEFAULT 500,
  "adminNotifications" BOOLEAN NOT NULL DEFAULT true,
  "googleDriveFolderId" TEXT,
  "googleSpreadsheetId" TEXT,
  "lastBackupAt" TIMESTAMPTZ
);

-- 8. FINANCIAL TRANSACTIONS TABLE (UUID Foreign Key referencing payments.id)
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'salary', 'withdrawal')),
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  category TEXT,
  "coachName" TEXT,
  notes TEXT,
  "paymentId" UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL DEFAULT 'admin-1',
  action TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. BACKUPS LOG TABLE
CREATE TABLE IF NOT EXISTS public.backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'manual')),
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completedAt" TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING')),
  filename TEXT NOT NULL,
  "googleDriveFileId" TEXT,
  "fileSize" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. IDEMPOTENCY KEYS TABLE (Protects against duplicate billing / transactions)
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  "userId" TEXT,
  operation TEXT NOT NULL,
  "responseStatus" INTEGER NOT NULL DEFAULT 200,
  "responseBody" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "expiresAt" TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- 12. SYNC QUEUE TABLE (Google Sheets & External Sync)
CREATE TABLE IF NOT EXISTS public.sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED')),
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "processedAt" TIMESTAMPTZ
);

-- 13. LOGIN ATTEMPTS TABLE (Distributed Persistent Rate Limiting)
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  "ipAddress" TEXT,
  "attemptsCount" INTEGER NOT NULL DEFAULT 1,
  "lockedUntil" TIMESTAMPTZ,
  "lastAttemptAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (identifier)
);

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_players_membership ON public.players("membershipCode");
CREATE INDEX IF NOT EXISTS idx_subscriptions_player ON public.subscriptions("playerId");
CREATE INDEX IF NOT EXISTS idx_payments_player ON public.payments("playerId");
CREATE INDEX IF NOT EXISTS idx_attendance_player ON public.attendance("playerId");
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_fin_tx_date ON public.financial_transactions(date);
CREATE INDEX IF NOT EXISTS idx_fin_tx_payment ON public.financial_transactions("paymentId");
CREATE INDEX IF NOT EXISTS idx_act_logs_time ON public.activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_idemp_key ON public.idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON public.sync_queue(status);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Allow full access for backend service role and authenticated operations:
CREATE POLICY "Allow service role full access" ON public.admins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.parents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.financial_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.backups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.idempotency_keys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.sync_queue FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access" ON public.login_attempts FOR ALL USING (true) WITH CHECK (true);
