ALTER TABLE public.winners
  ADD COLUMN IF NOT EXISTS is_tied boolean NOT NULL DEFAULT false;

ALTER TABLE public.winners
  ADD COLUMN IF NOT EXISTS tie_resolved_by uuid REFERENCES public.profiles(id);
