# Implementações futuras

Único backlog vivo do Nimbus. Voltar aqui de vez em quando: marcar **feito** com data, **adiado** com motivo, ou riscar o que não vale mais.

Não é lista de tudo que o produto já faz. Referência do que **já está no ar**: `docs/architecture.md`, `docs/payments.md`, `docs/decisions.md`.

**Como atualizar:** altere o status na tabela; se um item ganhar um roteiro longo, acrescente uma seção abaixo (como a do WhatsApp). Não criar outro `.md` de plano.

---

## Painel

| Status | Item | Notas |
|--------|------|--------|
| **Adiado (custo)** | WhatsApp automático via API oficial da Meta | Ver seção completa abaixo. Hoje só `wa.me` manual. |
| Pendente | CAPTCHA no checkout (Turnstile/hCaptcha) | Corta spam. |
| Pendente | Rate limit distribuído (Redis/Upstash) | O limite atual some entre instâncias serverless. |
| Pendente | Expiração/revogação do link mágico de entrega | TTL + “encerrar link” na rota. |
| Pendente | RBAC real nas APIs | Atendente ≠ dono (cupons, taxas, caixa). |
| Pendente | Auditoria mínima | Quem mudou preço, encerrou rota, resetou senha, suspendeu loja. |
| Pendente | Super-admin no banco + MFA | Hoje é allowlist de e-mail. |
| Pendente | Idempotência no pedido público | Evita duplicar em retry de rede. |
| Pendente | Testes automatizados nos fluxos críticos | Checkout, cupom/frete, membership, webhook. |
| Pendente | Backup/restore documentado no painel Supabase | Ops (S3-04). |
| Pendente | UTMs / atribuição de tráfego no pedido | Hoje só `origem` online vs admin. |
| Feito | PIX / cartão online (MP, Asaas, PagBank) | Ver `docs/payments.md`. |
| Feito | Relatórios redesenhados (KPI + gráfico) | Ship 2026-08-13. |
| Feito | Sentry | Monitoring no app. |
| Feito | Extrator / import de cardápio | Super-admin + `tools/menu-extractor`. |

---

## WhatsApp automático — API oficial da Meta

**Status:** adiado. Não implementar até haver orçamento. A landing fala “WhatsApp automático”; no código isso **não existe**.

### O que já existe

- Pedido nasce `novo` (`lib/orders/publicOrderServer.js`, pagamento aprovado, balcão em `lib/orders/adminOrdersClient.js`).
- Status: `novo` → `em_preparo` → `saiu_entrega` → `concluido` (+ `cancelado`). Sem hook de notificação.
- Telefone: `pedidos.cliente_telefone`.
- Textos em `lib/orderWhatsApp.js` — só quando o lojista clica em Notificar / Enviar resumo (`wa.me`).
- Meta no projeto hoje = Pixel (`empresas.meta_pixel_id`), não Cloud API.

### Como a Cloud API cobra (delivery)

- Fora da janela de 24h (cliente não falou com a loja): só **template** aprovado → pedido/status quase sempre **cobrados** (*utility*).
- Dentro de 24h após o cliente escrever: texto livre e utility **grátis**.
- *Marketing* (promo) é outra tarifa — não usar em status de pedido.
- O número da Cloud API **não pode** ficar no app WhatsApp Business do celular (é um ou outro).
- Precisa de **opt-in** no checkout (LGPD).

### Processo na Meta (quando for a hora)

Não usar um número único Nimbus (cliente veria “Nimbus”, não a loja).

Caminho certo: **cada loja com o próprio WhatsApp** (Embedded Signup / Tech Provider), parecido com PagBank Connect. A Meta cobra a WABA dona do número.

1. Business Manager + CNPJ e verificação.
2. App em developers.facebook.com com produto WhatsApp.
3. WABA + número 55 + nome de exibição da loja.
4. Cartão no Billing Hub (BRL para contas BR elegíveis; conferir na época).
5. Templates *utility*: `pedido_recebido`, `pedido_em_preparo`, `saiu_entrega`, `pedido_pronto_retirada`, `pedido_entregue`, `pedido_cancelado` (nome, nº, loja — sem tom de promoção).
6. Webhook de `delivered` / `failed`.
7. Token e `phone_number_id` por loja, criptografados (`PAYMENTS_ENC_KEY` ou chave irmã).

BSP (Zenvia, Twilio, 360dialog) encurta o cadastro e soma markup. O código deve ser `sendUtilityTemplate(...)` para poder trocar provedor.

### Custo aproximado (revalidar no [rate card](https://developers.facebook.com/docs/whatsapp/pricing/) — muda no 1º dia do trimestre)

Referência pública BRL ~2026:

- Utility: ~ **R$ 0,035** por mensagem entregue.
- Marketing: ~ **R$ 0,32** — não usar no pedido.
- Serviço na janela 24h: **R$ 0**.

Simulação (4 avisos por pedido):

- ~ **R$ 0,14 / pedido**
- 50 pedidos/dia → ~ **R$ 210 / mês / loja**
- 150 pedidos/dia → ~ **R$ 630 / mês / loja**

Quem paga no MVP futuro: **a loja** (cartão na Meta). Nimbus não absorve isso agora — por isso está adiado.

Meta avisou ajuste de utility/service em ago–out/2026; tratar os números como teto, não contrato.

### Código (quando implementar)

Gatilhos **só no servidor**:

- Pedido recebido: após `persistPreparedPublicOrder` e após pagamento aprovado. Balcão: só com telefone e flag ligada.
- Status: hoje `updateAdminOrderStatus` roda no **cliente**; precisa de `POST /api/admin/orders/status` (ou equivalente) para disparar o Graph. Incluir rota/entregador marcar entregue.
- Não enviar: sem telefone, loja desligou o evento, template falhou (logar e seguir).

Peças: `lib/whatsapp/`; tabelas `empresa_whatsapp_cloud` + `whatsapp_message_logs`; `POST /api/webhooks/whatsapp`; Integrações no admin; opt-in no checkout; copy de `lib/orderWhatsApp.js` (no automático, `novo` = “recebemos”, não “já estamos preparando”); `wa.me` como fallback.

Fora da 1ª versão: marketing, chatbot, inbox no admin.

Ordem quando houver verba: quem paga → WABA de teste (loja modelo) → templates → envio + webhook + flags → piloto em **uma** loja → demais.

---

## Segurança / plataforma (resumo)

Herdado do antigo roadmap de maturidade. Prioridade sugerida quando for a vez: CAPTCHA → rate limit Redis → link mágico → auditoria → RBAC → testes → o resto.

Sentry já está no ar. Headers CSP/HSTS, filas, LGPD exportar/apagar cliente e feature flags continuam em aberto — promover para a tabela acima quando virar prioridade.
