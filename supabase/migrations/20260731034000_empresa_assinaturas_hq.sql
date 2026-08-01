-- Assinaturas Nimbus (Stripe Billing) + flag UI lojista + histórico suspensão

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS assinatura_nimbus_habilitada BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.empresas.assinatura_nimbus_habilitada IS
  'Quando true (e NIMBUS_ASSINATURA_UI_ENABLED), mostra bloco Assinatura no admin do lojista.';

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS suspensa_motivo TEXT;

CREATE TABLE IF NOT EXISTS public.empresa_assinaturas (
  empresa_id UUID PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  status TEXT NOT NULL DEFAULT 'none'
    CHECK (status IN (
      'none', 'trialing', 'active', 'past_due', 'canceled', 'unpaid',
      'incomplete', 'incomplete_expired', 'paused'
    )),
  status_local TEXT
    CHECK (status_local IS NULL OR status_local IN ('cortesia')),
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  trial_end TIMESTAMPTZ,
  ultimo_pagamento_em TIMESTAMPTZ,
  valor_centavos INTEGER,
  plano_codigo TEXT DEFAULT 'nimbus_completo',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_empresa_assinaturas_status
  ON public.empresa_assinaturas (status);

CREATE INDEX IF NOT EXISTS idx_empresa_assinaturas_stripe_customer
  ON public.empresa_assinaturas (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_empresa_assinaturas_stripe_subscription
  ON public.empresa_assinaturas (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.empresa_assinatura_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  resumo TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_empresa_assinatura_eventos_empresa
  ON public.empresa_assinatura_eventos (empresa_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.empresa_suspensao_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  acao TEXT NOT NULL CHECK (acao IN ('suspender', 'reativar')),
  motivo TEXT,
  autor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_empresa_suspensao_eventos_empresa
  ON public.empresa_suspensao_eventos (empresa_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.empresa_timeline_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  detalhe TEXT,
  meta JSONB,
  autor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_empresa_timeline_eventos_empresa
  ON public.empresa_timeline_eventos (empresa_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.empresa_onboarding (
  empresa_id UUID PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  tem_logo BOOLEAN NOT NULL DEFAULT false,
  tem_catalogo BOOLEAN NOT NULL DEFAULT false,
  tem_horarios BOOLEAN NOT NULL DEFAULT false,
  tem_go_live BOOLEAN NOT NULL DEFAULT false,
  tem_primeiro_pedido BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.empresa_assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_assinatura_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_suspensao_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_timeline_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_onboarding ENABLE ROW LEVEL SECURITY;

-- Super-admin e APIs usam service role (bypass RLS).
-- Lojista: leitura da própria assinatura se membro.
DROP POLICY IF EXISTS empresa_assinaturas_membro_select ON public.empresa_assinaturas;
CREATE POLICY empresa_assinaturas_membro_select ON public.empresa_assinaturas
  FOR SELECT
  USING (usuario_pertence_empresa(empresa_id));

DROP POLICY IF EXISTS empresa_onboarding_membro_select ON public.empresa_onboarding;
CREATE POLICY empresa_onboarding_membro_select ON public.empresa_onboarding
  FOR SELECT
  USING (usuario_pertence_empresa(empresa_id));
