ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS rejection_feedback text,
  ADD COLUMN IF NOT EXISTS banner_image text;

COMMENT ON COLUMN challenges.rejection_feedback IS
  'Admin-provided reason when a challenge is rejected. Nullable.';
COMMENT ON COLUMN challenges.banner_image IS
  'Supabase Storage path for the challenge hero/banner image. Nullable.';
