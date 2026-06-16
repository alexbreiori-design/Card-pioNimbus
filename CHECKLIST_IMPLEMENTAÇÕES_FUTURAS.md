# Checklist — implementações futuras

Itens adiados de propósito (fora do MVP atual).

---

## PIX automático + Mercado Pago OAuth

**Status:** pendente  
**Prioridade:** pós-MVP  
**Decisões já tomadas:**

- Gateway: Mercado Pago (OAuth, não Access Token manual)
- Dinheiro cai **direto na conta do lojista** — Nimbus não é intermediário
- Ambiente inicial: **produção** (sandbox em fase 2)
- Conta MP obrigatória para PIX automático; recusa = PIX manual
- Tags na UI (sem coluna nova em `pedidos`): `Aguardando Pix`, `Pix confirmado`, `Pgt na entrega`
- Pedido criado ao gerar QR; tag atualiza via webhook
- Lojista move manualmente para produção (`em_preparo`)
- Expiração QR: **15 min** → `cancelado` + novo QR sem perder sacola
- WhatsApp pós-pagamento: aviso loja, sem comprovante
- 3 sons em `public/sounds/`: `novo-pedido.mp3`, `novo-pedido-aguardando-pix.mp3`, `pix-confirmado.mp3`
- Toggle PIX manual/automático: Minha Loja; OAuth: Integrações
- Bloquear troca manual↔automático com pedidos Aguardando Pix abertos
- Relatórios por tag de pagamento: fase 2

### Fase 0 — App Mercado Pago (Nimbus, uma vez)

- [ ] Criar aplicação MP Developers
- [ ] Redirect URI: `/api/integrations/mercadopago/callback`
- [ ] Webhook URL: `/api/webhooks/payments/mercadopago`
- [ ] Env: `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, criptografia de tokens

### Fase 1 — Fundação de dados

- [ ] Migration: `empresas.pix_modo` (`manual` | `automatico`)
- [ ] Tabelas: `empresa_payment_configs`, `pagamentos`, `pagamento_eventos`
- [ ] `lib/payments/` (types, tags, registry, encrypt)

### Fase 2 — OAuth Mercado Pago

- [ ] `GET /api/integrations/mercadopago/connect`
- [ ] `GET /api/integrations/mercadopago/callback`
- [ ] `POST /api/integrations/mercadopago/disconnect`
- [ ] `GET /api/admin/payment-config`
- [ ] UI Integrações → card Mercado Pago

### Fase 3 — API cobrança PIX

- [ ] `GET /api/public/payment-methods`
- [ ] `POST /api/payments/pix/create`
- [ ] `GET /api/payments/:id/status`
- [ ] Adapter `MercadoPagoProvider`

### Fase 4 — Webhook

- [ ] `POST /api/webhooks/payments/mercadopago`
- [ ] Deduplicação + tag Pix confirmado + som

### Fase 5 — Checkout público PIX automático

- [ ] Tela QR + timer + polling
- [ ] Expirado → novo QR (sacola intacta)
- [ ] Sucesso → WhatsApp aviso (sem comprovante)

### Fase 6 — Admin

- [ ] Toggle PIX manual/automático em Minha Loja
- [ ] Badges de pagamento na lista de pedidos
- [ ] Bloqueio de troca com pedidos abertos
- [ ] 3 sons configuráveis

### Fase 7 — Expiração e robustez

- [ ] Cron expiração 15 min
- [ ] Refresh token OAuth
- [ ] Rate limit em `pix/create`

### Fase 8 — Piloto e go-live

- [ ] Loja piloto + pedido teste + checklist comercial

---

## Cartão online (redirect gateway)

**Status:** pendente  
**Depende de:** PIX automático + OAuth MP

- [ ] Checkout Pro / Payment Link (sem checkout próprio no Nimbus)
- [ ] Webhook compartilhado com PIX
- [ ] UI “Pagar agora com cartão” no checkout

---

## Sandbox Mercado Pago no admin

**Status:** pendente (fase 2)

- [ ] Toggle teste/produção por loja

---

## Relatórios por forma/tag de pagamento

**Status:** pendente (fase 2)

- [ ] Filtros e métricas por tag de pagamento no dashboard
