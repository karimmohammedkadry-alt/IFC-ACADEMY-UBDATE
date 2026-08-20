-- ==============================================================================
-- IFC ACADEMY (KING FU ACADEMY) - SUPABASE POSTGRESQL SCHEMA & RLS POLICIES
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PLAYERS TABLE
CREATE TABLE IF NOT EXISTS public.players (
  id TEXT PRIMARY KEY DEFAULT ('ply-' || substring(uuid_generate_v4()::text from 1 for 8)),
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

-- 2. PARENTS TABLE
CREATE TABLE IF NOT EXISTS public.parents (
  id TEXT PRIMARY KEY DEFAULT ('par-' || substring(uuid_generate_v4()::text from 1 for 8)),
  "playerId" TEXT NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  "parentName" TEXT NOT NULL,
  "parentPhone" TEXT NOT NULL,
  relationship TEXT NOT NULL,
  "emergencyPhone" TEXT
);

-- 3. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id TEXT PRIMARY KEY DEFAULT ('sub-' || substring(uuid_generate_v4()::text from 1 for 8)),
  "playerId" TEXT NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  "planName" TEXT NOT NULL DEFAULT 'اشتراك شهري',
  value NUMERIC NOT NULL DEFAULT 500,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Paid', 'Unpaid', 'ExpiringSoon', 'Expired')),
  "lastPaymentDate" DATE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY DEFAULT ('pay-' || substring(uuid_generate_v4()::text from 1 for 8)),
  "playerId" TEXT NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  "subscriptionId" TEXT REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  "paymentMethod" TEXT NOT NULL CHECK ("paymentMethod" IN ('Cash', 'Wallet', 'InstaPay')),
  "paidBy" TEXT NOT NULL DEFAULT 'ولي الأمر',
  "paymentDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Paid',
  "receiptNumber" TEXT NOT NULL,
  notes TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
  id TEXT PRIMARY KEY DEFAULT ('att-' || substring(uuid_generate_v4()::text from 1 for 8)),
  "playerId" TEXT NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  "group" TEXT NOT NULL CHECK ("group" IN ('براعم', 'ناشئين', 'شباب')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('Present', 'Absent')),
  notes TEXT,
  "markedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("playerId", date)
);

-- 6. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY DEFAULT 'academy_settings',
  "academyName" TEXT NOT NULL DEFAULT 'IFC ACADEMY',
  phone TEXT,
  address TEXT,
  currency TEXT NOT NULL DEFAULT 'EGP',
  "defaultMonthlyFee" NUMERIC NOT NULL DEFAULT 500,
  "adminNotifications" BOOLEAN NOT NULL DEFAULT true,
  "googleDriveFolderId" TEXT,
  "lastBackupAt" TIMESTAMPTZ
);

-- 7. FINANCIAL TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id TEXT PRIMARY KEY DEFAULT ('tx-' || substring(uuid_generate_v4()::text from 1 for 8)),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'salary', 'withdrawal')),
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  category TEXT,
  "coachName" TEXT,
  notes TEXT,
  "paymentId" TEXT REFERENCES public.payments(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY DEFAULT ('act-' || substring(uuid_generate_v4()::text from 1 for 8)),
  "userId" TEXT NOT NULL DEFAULT 'admin-1',
  action TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. BACKUPS LOG TABLE
CREATE TABLE IF NOT EXISTS public.backups (
  id TEXT PRIMARY KEY DEFAULT ('bk-' || substring(uuid_generate_v4()::text from 1 for 8)),
  type TEXT NOT NULL CHECK (type IN ('daily', 'manual')),
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completedAt" TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING')),
  filename TEXT NOT NULL,
  "googleDriveFileId" TEXT,
  "fileSize" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

-- Allow authenticated backend (via service_role or API keys) full access:
CREATE POLICY "Allow full access for service role" ON public.players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for service role" ON public.parents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for service role" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for service role" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for service role" ON public.attendance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for service role" ON public.settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for service role" ON public.financial_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for service role" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for service role" ON public.backups FOR ALL USING (true) WITH CHECK (true);
