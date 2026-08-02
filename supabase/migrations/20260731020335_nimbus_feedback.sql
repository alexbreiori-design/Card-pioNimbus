-- Feedback do lojista para a Nimbus (por empresa)

CREATE TABLE IF NOT EXISTS public.nimbus_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  autor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_email TEXT,
  autor_nome TEXT,
  categoria TEXT NOT NULL CHECK (
    categoria IN (
      'nova_funcionalidade',
      'ajuste',
      'problema',
      'sugestao',
      'suporte'
    )
  ),
  mensagem TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'lido', 'arquivado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lido_em TIMESTAMPTZ,
  lido_por UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_nimbus_feedback_empresa_created
  ON public.nimbus_feedback (empresa_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nimbus_feedback_status
  ON public.nimbus_feedback (status, created_at DESC)
  WHERE status = 'aberto';

ALTER TABLE public.nimbus_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nimbus_feedback_membro_select ON public.nimbus_feedback;
CREATE POLICY nimbus_feedback_membro_select ON public.nimbus_feedback
  FOR SELECT
  USING (usuario_pertence_empresa(empresa_id));

DROP POLICY IF EXISTS nimbus_feedback_membro_insert ON public.nimbus_feedback;
CREATE POLICY nimbus_feedback_membro_insert ON public.nimbus_feedback
  FOR INSERT
  WITH CHECK (usuario_pertence_empresa(empresa_id));

-- Super-admin usa service role nas APIs (bypass RLS).
