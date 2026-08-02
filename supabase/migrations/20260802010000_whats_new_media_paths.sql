-- Galeria de imagens por novidade (slideshow com fade no modal)

ALTER TABLE public.whats_new_entries
  ADD COLUMN IF NOT EXISTS media_paths TEXT[] NOT NULL DEFAULT '{}';

UPDATE public.whats_new_entries
SET media_paths = ARRAY[media_path]
WHERE media_path IS NOT NULL
  AND media_path <> ''
  AND (media_paths IS NULL OR cardinality(media_paths) = 0);
