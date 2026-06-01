-- Segmento/nicho da empresa (ex.: pizzaria, hamburgueria)
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS segmento TEXT;

COMMENT ON COLUMN public.empresas.segmento IS 'Nicho da empresa usado para adaptar funções e aparência do cardápio.';
