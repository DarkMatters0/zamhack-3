-- Migration: company_payment_flow
-- Adds listing fee fields to challenges, payment_type
-- discriminator to payments, and approved_awaiting_payment
-- status to the challenge_status enum.
-- Safe to re-run (all statements are idempotent).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add 'approved_awaiting_payment' to the challenge_status enum
-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: enum ADD VALUE cannot be rolled back.
-- This runs outside a transaction block to satisfy Postgres requirements.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'approved_awaiting_payment'
      AND enumtypid = 'public.challenge_status'::regtype
  ) THEN
    ALTER TYPE public.challenge_status
      ADD VALUE 'approved_awaiting_payment' AFTER 'pending_approval';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add listing fee columns to challenges
-- ─────────────────────────────────────────────────────────────────────────────
-- listing_fee: company listing fee in pesos (separate from
--   entry_fee_amount which is the student join fee)
-- listing_fee_set_by: audit trail — which admin set the fee
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS listing_fee          numeric(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS listing_fee_currency text          DEFAULT 'PHP',
  ADD COLUMN IF NOT EXISTS listing_fee_set_by   uuid          DEFAULT NULL
    REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Add payment_type discriminator column to payments
-- ─────────────────────────────────────────────────────────────────────────────
-- payment_type: 'student_entry' (join fee paid by student)
--               'company_listing' (listing fee paid by company)
-- Default is 'student_entry' for all existing rows.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'student_entry';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Add CHECK constraint on payment_type (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payments_payment_type_check'
      AND table_name = 'payments'
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_payment_type_check
      CHECK (payment_type IN ('student_entry', 'company_listing'));
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS policy: company users can read their own listing fee payments
-- ─────────────────────────────────────────────────────────────────────────────
-- Allows company_admin and company_member to read listing fee
-- payments for challenges owned by their organization.
-- Scoped to payment_type = 'company_listing' only —
-- student payments remain hidden from companies.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'company can read their own challenge payments'
      AND tablename = 'payments'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "company can read their own challenge payments"
      ON public.payments
      FOR SELECT
      TO authenticated
      USING (
        challenge_id IN (
          SELECT id FROM public.challenges
          WHERE organization_id = (
            SELECT organization_id FROM public.profiles
            WHERE id = auth.uid()
          )
        )
        AND payment_type = 'company_listing'
      );
    $policy$;
  END IF;
END $$;
