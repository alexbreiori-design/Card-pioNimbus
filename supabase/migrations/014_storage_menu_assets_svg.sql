-- Permite SVG no bucket menu-assets (ex.: logo da comanda).
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
WHERE id = 'menu-assets';
