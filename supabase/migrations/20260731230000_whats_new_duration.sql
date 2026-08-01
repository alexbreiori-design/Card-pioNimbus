-- Duração do slide no modal de Novidades (segundos)
ALTER TABLE public.whats_new_entries
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NOT NULL DEFAULT 8
  CHECK (duration_seconds >= 3 AND duration_seconds <= 120);
