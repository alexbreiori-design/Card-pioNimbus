-- Permite provider Asaas (substitui o slot comercial do Pagar.me na UI).
ALTER TABLE public.empresa_pagamento_contas
  DROP CONSTRAINT IF EXISTS empresa_pagamento_contas_provider_check;

ALTER TABLE public.empresa_pagamento_contas
  ADD CONSTRAINT empresa_pagamento_contas_provider_check
  CHECK (provider IN ('mercado_pago', 'pagarme', 'pagbank', 'asaas'));

ALTER TABLE public.pagamentos
  DROP CONSTRAINT IF EXISTS pagamentos_provider_check;

ALTER TABLE public.pagamentos
  ADD CONSTRAINT pagamentos_provider_check
  CHECK (provider IN ('mercado_pago', 'pagarme', 'pagbank', 'asaas'));
