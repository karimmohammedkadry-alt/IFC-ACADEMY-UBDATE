-- ==============================================================================
-- SAFE NON-DESTRUCTIVE MIGRATION FOR EXISTING SUPABASE DATABASE
-- Fixes incompatible foreign-key types (TEXT -> UUID) without dropping tables or losing data
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. FIX PARENTS TABLE (playerId)
DO $$
BEGIN
  -- Drop constraint if exists to allow altering column type
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'parents_playerId_fkey' AND table_name = 'parents'
  ) THEN
    ALTER TABLE public.parents DROP CONSTRAINT "parents_playerId_fkey";
  END IF;

  -- Alter column to UUID if it is TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parents' AND column_name = 'playerId' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.parents ALTER COLUMN "playerId" TYPE UUID USING "playerId"::uuid;
  END IF;

  -- Add foreign key constraint back
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'parents_playerId_fkey' AND table_name = 'parents'
  ) THEN
    ALTER TABLE public.parents 
      ADD CONSTRAINT "parents_playerId_fkey" 
      FOREIGN KEY ("playerId") REFERENCES public.players(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. FIX SUBSCRIPTIONS TABLE (playerId)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'subscriptions_playerId_fkey' AND table_name = 'subscriptions'
  ) THEN
    ALTER TABLE public.subscriptions DROP CONSTRAINT "subscriptions_playerId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriptions' AND column_name = 'playerId' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.subscriptions ALTER COLUMN "playerId" TYPE UUID USING "playerId"::uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'subscriptions_playerId_fkey' AND table_name = 'subscriptions'
  ) THEN
    ALTER TABLE public.subscriptions 
      ADD CONSTRAINT "subscriptions_playerId_fkey" 
      FOREIGN KEY ("playerId") REFERENCES public.players(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. FIX PAYMENTS TABLE (playerId and subscriptionId)
DO $$
BEGIN
  -- Drop existing constraints
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payments_playerId_fkey' AND table_name = 'payments'
  ) THEN
    ALTER TABLE public.payments DROP CONSTRAINT "payments_playerId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payments_subscriptionId_fkey' AND table_name = 'payments'
  ) THEN
    ALTER TABLE public.payments DROP CONSTRAINT "payments_subscriptionId_fkey";
  END IF;

  -- Alter columns to UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'playerId' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.payments ALTER COLUMN "playerId" TYPE UUID USING "playerId"::uuid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'subscriptionId' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.payments ALTER COLUMN "subscriptionId" TYPE UUID USING (CASE WHEN "subscriptionId" IS NULL OR "subscriptionId" = '' THEN NULL ELSE "subscriptionId"::uuid END);
  END IF;

  -- Re-add foreign keys
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payments_playerId_fkey' AND table_name = 'payments'
  ) THEN
    ALTER TABLE public.payments 
      ADD CONSTRAINT "payments_playerId_fkey" 
      FOREIGN KEY ("playerId") REFERENCES public.players(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payments_subscriptionId_fkey' AND table_name = 'payments'
  ) THEN
    ALTER TABLE public.payments 
      ADD CONSTRAINT "payments_subscriptionId_fkey" 
      FOREIGN KEY ("subscriptionId") REFERENCES public.subscriptions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. FIX ATTENDANCE TABLE (playerId)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'attendance_playerId_fkey' AND table_name = 'attendance'
  ) THEN
    ALTER TABLE public.attendance DROP CONSTRAINT "attendance_playerId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance' AND column_name = 'playerId' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.attendance ALTER COLUMN "playerId" TYPE UUID USING "playerId"::uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'attendance_playerId_fkey' AND table_name = 'attendance'
  ) THEN
    ALTER TABLE public.attendance 
      ADD CONSTRAINT "attendance_playerId_fkey" 
      FOREIGN KEY ("playerId") REFERENCES public.players(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. FIX FINANCIAL TRANSACTIONS (paymentId)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'financial_transactions_paymentId_fkey' AND table_name = 'financial_transactions'
  ) THEN
    ALTER TABLE public.financial_transactions DROP CONSTRAINT "financial_transactions_paymentId_fkey";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'financial_transactions' AND column_name = 'paymentId' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.financial_transactions ALTER COLUMN "paymentId" TYPE UUID USING (CASE WHEN "paymentId" IS NULL OR "paymentId" = '' THEN NULL ELSE "paymentId"::uuid END);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'financial_transactions_paymentId_fkey' AND table_name = 'financial_transactions'
  ) THEN
    ALTER TABLE public.financial_transactions 
      ADD CONSTRAINT "financial_transactions_paymentId_fkey" 
      FOREIGN KEY ("paymentId") REFERENCES public.payments(id) ON DELETE SET NULL;
  END IF;
END $$;
