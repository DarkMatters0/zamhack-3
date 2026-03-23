ALTER TABLE public.challenge_evaluators
  ADD COLUMN IF NOT EXISTS is_chief boolean NOT NULL DEFAULT false;

-- Only one evaluator per challenge can be chief.
-- Enforced at the application layer, not DB level (to allow easy reassignment).
