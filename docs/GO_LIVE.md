# Checklist executável — Cardápio Nimbus (go-live e profissionalização)

Use este arquivo como roteiro único antes e durante o piloto com o primeiro cliente.  
Marque `[x]` conforme concluir. Itens estão agrupados por prioridade de execução, não por “fase de produto”.

**Legenda**

| Tag | Significado |
|-----|-------------|
| `[CÓDIGO]` | Exige alteração no repositório |
| `[OPS]` | Processo manual (Supabase, Vercel, domínio, você) |
| `[TESTE]` | Validar em browser / celular real |
| `[DOC]` | Documentação ou página estática |

---

## Como usar

1. **Bloco A** — faça antes de enviar o link ao cliente.  
2. **Bloco B** — faça na primeira semana do piloto.  
3. **Bloco C** — melhorias pertinentes (profissionaliza sem inchhar).  
4. **Bloco D** — radar (super-admin); não bloqueia o 1º cliente.

Ao final de cada bloco há **critério de pronto**.

---

# A — Indispensável (antes do link público)

## A1 — Infraestrutura e domínio

- [ ] `[OPS]` Domínio **cardapionimbus.com.br** apontando para a Vercel (apex e/ou `www`).
- [ ] `[OPS]` `NEXT_PUBLIC_SITE_URL=https://cardapionimbus.com.br` na Vercel (Production).
- [ ] `[OPS]` URLs divulgadas: cardápio `https://cardapionimbus.com.br/{slug}`, login `/login`, vitrine `/home` (ver `docs/DOMINIO.md`).
- [ ] `[OPS]` Certificado HTTPS ativo (Vercel) e teste em celular 4G.
- [ ] `[OPS]` Redirect consistente (`www` ↔ apex), sem link quebrado.
- [ ] `[OPS]` Variáveis na Vercel (Production): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, APIs de geocoding se usar entrega.
- [ ] `[OPS]` Conferir host Supabase após deploy: `GET /api/health/config` com `x-health-token` (se `HEALTH_CONFIG_TOKEN` configurado).
- [ ] `[DOC]` Lista de env vars documentada (comentário em README ou `docs/ENV.md`).

**Pronto quando:** URL final abre o cardápio do slug piloto sem aviso de certificado ou erro de config.

---

## A2 — Onboarding da loja piloto (Supabase + admin)

Substitua `{slug}`, `{email}`, `{nome}` pelos dados reais.

- [ ] `[OPS]` Slug único validado: `SELECT slug FROM empresas WHERE slug = '{slug}';` → vazio.
- [ ] `[OPS]` Inserir linha em `empresas` (nome, telefone, cidade, `cor_marca`, etc.).
- [ ] `[OPS]` Criar usuário em **Authentication → Users** (Auto Confirm User).
- [ ] `[OPS]` Executar `supabase/scripts/vincular_usuario_empresa.sql` (ajustar UID/e-mail/slug/papel `proprietario`).
- [ ] `[OPS]` Confirmar vínculo:
  ```sql
  SELECT e.slug, u.email, em.papel, em.ativo
  FROM empresa_membros em
  JOIN empresas e ON e.id = em.empresa_id
  JOIN auth.users u ON u.id = em.usuario_id
  WHERE e.slug = '{slug}';
  ```
- [ ] `[OPS]` Garantir `menu_store_state` para o `{slug}` (seed ou primeiro save no admin).
- [ ] `[OPS]` Migrations `001`–`008` aplicadas em produção; rodar `supabase/scripts/verificar_migrations.sql`.
- [ ] `[TESTE]` Login em `/login` → admin carrega a loja correta (seletor, se houver mais de uma).

**Pronto quando:** dono da loja entra no admin e vê só a loja dele (ou seletor correto).

---

## A3 — Configuração mínima no admin (com o dono ou por você)

- [ ] `[TESTE]` **Minha loja:** logo, capa, nome, telefone/WhatsApp, endereço, segmento.
- [ ] `[TESTE]` **Minha loja:** chave Pix + descrição (se aceita Pix).
- [ ] `[TESTE]` **Minha loja:** tempos de entrega/retirada (HH:MM).
- [ ] `[TESTE]` **Minha loja:** horários da semana coerentes com operação real.
- [ ] `[TESTE]` **Produtos:** ao menos 3 itens com preço e foto (ou placeholder aceitável).
- [ ] `[TESTE]` **Adicionais** (se o cardápio usa): vinculados aos produtos certos.
- [ ] `[TESTE]` **Entrega:** zonas/taxas ou retirada-only definido.
- [ ] `[TESTE]` **Integrações:** Meta Pixel só se o cliente usar (ID válido).

**Pronto quando:** cardápio público reflete identidade e cardápio real o suficiente para pedido de teste.

---

## A4 — Produto: pedido e operação (dia a dia)

Implementação: ver **`docs/PLANO_EXECUCAO.md` Etapa 2 (lotes 2A–2F)**. Este bloco é validação antes do link.

- [ ] `[CÓDIGO]` **Alerta de pedido novo** (A2-01): som + notificação do navegador.
- [ ] `[CÓDIGO]` **Fechar loja agora** (A2-02–A2-04): toggle manual + cardápio/API respeitam.
- [ ] `[CÓDIGO]` **Kanban:** notificar status WhatsApp, resumo no detalhe, “há X min”, arquivados (A2-10–A2-14).
- [ ] `[CÓDIGO]` **Comanda térmica** 80 mm: imprimir do kanban e do novo pedido manual (A2-20–A2-25). Largura 58/80 mm em Minha loja → Impressão de comanda.
- [ ] `[CÓDIGO]` **Duplicar** produto/categoria (A2-30–A2-31).
- [ ] `[CÓDIGO]` **UI admin** Promoções/Clientes/Entrega alinhadas a Produtos (A2-40–A2-43).
- [x] `[CÓDIGO]` **Link suporte** discreto no admin (S3-08). Manual in-app (A2-50/52) postergado.
- [ ] `[TESTE]` Loja fechada: sacola/checkout bloqueados; mensagem clara no header.
- [ ] `[TESTE]` Pedido **delivery** e **retirada** completos.
- [ ] `[TESTE]` Pedido no kanban **Novos** em até ~15s (polling).
- [ ] `[TESTE]` Mudança de status reflete em **Meus pedidos** no cardápio.
- [ ] `[TESTE]` Cancelamento com confirmação (admin) e histórico correto.
- [ ] `[TESTE]` Impressão em **impressora térmica real** (não só preview do navegador).

**Pronto quando:** você valida o fluxo completo sozinho; o dono repete no treinamento (A9).

---

## A5 — Pagamento Pix (expectativa alinhada)

- [ ] `[TESTE]` Checkout Pix exibe chave na confirmação.
- [ ] `[CÓDIGO]` Botão ou ação **copiar chave Pix** (se ainda não existir).
- [ ] `[DOC]` Texto curto na confirmação: pagamento é manual / enviar comprovante pelo WhatsApp da loja.
- [ ] `[TESTE]` Link **Falar com a loja** no acompanhamento de pedido abre WhatsApp com mensagem coerente.
- [ ] `[TESTE]` Troco em dinheiro: fluxo Sim/Não + valor validado (se loja aceita dinheiro).

**Pronto quando:** cliente de teste entende que Pix não é automático e sabe o que fazer após pedir.

---

## A6 — Segurança e resiliência mínima

- [ ] `[CÓDIGO]` Rate limit em `POST /api/public-order` (por IP e/ou slug).
- [ ] `[OPS]` Revisar RLS: `pedidos`, `clientes`, `empresa_membros`, `menu_store_state` (anon não escreve onde não deve).
- [ ] `[OPS]` Backup Supabase habilitado no plano; saber onde restaurar (documentar link do painel).
- [ ] `[DOC]` Plano “se cair”: (1) logs Vercel → Functions, (2) health config, (3) WhatsApp do dono avisa você.
- [ ] `[TESTE]` Payload inválido em `public-order` retorna erro sem quebrar servidor.

**Pronto quando:** não há escrita pública aberta além das APIs previstas; você sabe onde olhar em incidente.

---

## A7 — Jurídico e confiança (enxuto)

- [ ] `[DOC]` Página **Privacidade** (dados coletados: nome, telefone, endereço, pedidos; finalidade; contato do controlador).
- [ ] `[DOC]` Página **Termos de uso** Nimbus ↔ lojista (disponibilidade, suporte, responsabilidades).
- [ ] `[CÓDIGO]` Links no rodapé do cardápio e/ou login admin para essas páginas.

**Pronto quando:** links acessíveis sem login; texto revisado por você (não precisa advogado no MVP, mas precisa existir).

---

## A8 — UX cardápio (celular + compartilhamento)

- [ ] `[TESTE]` Fluxo completo em **smartphone** (Android + iOS se possível): busca, produto, adicionais, sacola, checkout, sucesso, meus pedidos.
- [ ] `[CÓDIGO]` `generateMetadata` por `{slug}`: título, descrição, imagem (logo/capa) para preview no WhatsApp.
- [ ] `[CÓDIGO]` Página amigável para slug inexistente (em vez de erro genérico).
- [ ] `[TESTE]` Pedido mínimo e taxa de entrega visíveis **antes** da última etapa do checkout (se já não estiverem — conferir).
- [ ] `[CÓDIGO]` Esconder ou remover rota `/cadastro` “Em construção” até existir produto.

**Pronto quando:** link colado no WhatsApp mostra nome da loja + imagem; fluxo mobile sem travas graves.

---

## A9 — Go-live: critério final do Bloco A

- [ ] `[OPS]` Checklist A1–A8 assinado por você (data: ______).
- [ ] `[OPS]` Dono treinado em: ver pedido novo, mudar status, fechar loja, editar Pix.
- [ ] `[TESTE]` Smoke pós-deploy: login → 1 pedido → 1 mudança de status → cardápio público ok.
- [ ] `[OPS]` Link final enviado ao cliente + salvo no seu controle (Notion/planilha).

**Bloco A pronto quando:** todos os itens acima marcados.

---

# B — Acompanhamento do piloto (após o link — não é backlog de código)

> Código do admin/comanda/kanban fica na **Etapa 2** do `PLANO_EXECUCAO.md`, **antes** do 1º cliente.  
> O Bloco B é só operação Nimbus ↔ loja depois que o sistema já está completo.

## B1 — Operação Nimbus (você ↔ cliente)

- [ ] `[OPS]` Canal de suporte definido (WhatsApp seu) e horário de resposta combinado.
- [ ] `[DOC]` Registrar slug, domínio, e-mail admin, data go-live em planilha interna.
- [ ] `[OPS]` Combinar com o dono: avisar você se pedido não chegar ou cardápio “sumir”.
- [ ] `[OPS]` Após cada deploy: abrir Vercel → último deployment → Logs (sem 5xx).
- [ ] `[TESTE]` Pedido real de cliente final (não só teste seu) acompanhado até concluído.

---

## B2 — Monitorar no piloto (feedback novo, não lista de dev)

- [ ] `[TESTE]` Pedido real de cliente final acompanhado até concluído.
- [ ] `[OPS]` Registrar bugs/sugestões que **não** estavam no plano (backlog pós-piloto).

**Bloco B pronto quando:** período combinado com o cliente sem incidente crítico não resolvido.

---

# C — Pertinente (após piloto ou se surgir demanda nova)

## C1 — Admin / operação

**Movido para antes do piloto:** `PLANO_EXECUCAO.md` Etapa 2 (A2-10–A2-14, A2-20–A2-31, A2-40–A2-52).

Itens que **permanecem aqui** (não bloqueiam 1º cliente):

- [ ] `[CÓDIGO]` Impressão automática ao chegar pedido `novo` (som + print silencioso) — só se o piloto pedir.
- [ ] `[TESTE]` Fluxo de arquivar com volume alto (stress) — opcional.

---

## C2 — Cardápio público

- [ ] `[CÓDIGO]` “Pedir de novo” ou reordenar último pedido (histórico) — se prioridade do piloto.
- [ ] `[TESTE]` Filtro/busca de produtos com cardápio grande (20+ itens).
- [ ] `[TESTE]` Acessibilidade básica: contraste botão principal, área de toque ≥ 44px nos CTAs críticos.

---

## C3 — Documentação e produto B2B

- [ ] `[DOC]` Mini manual + suporte no admin → **Etapa 2F** (A2-50–A2-52), antes do piloto.
- [ ] `[DOC]` Checklist pós-deploy (5 linhas) colado no README do projeto.
- [ ] `[DOC]` Roteiro **2ª unidade** (mesmo dono): nova `empresas` + `empresa_membros` + `menu_store_state`, mesmo Auth — ver `supabase/README.md` + script vincular.

---

## C4 — Importação e escala de cadastro (opcional no piloto)

- [ ] `[DOC]` Processo manual de importar cardápio (planilha ou você cadastra na sessão de onboarding).
- [ ] `[CÓDIGO]` Importação por planilha — só se o piloto exigir volume alto de SKUs.

**Bloco C:** marque conforme prioridade do cliente piloto; não é gate para go-live.

---

# D — Radar: Super-admin “criar loja” no painel

> Não bloqueia o 1º cliente (hoje: SQL + Auth manual). Manter no backlog visível.

## D1 — Definição

- [ ] `[DOC]` Quem acessa: apenas e-mails da equipe Nimbus (lista em env ou tabela `super_admins`).
- [ ] `[DOC]` Campos mínimos: slug, nome fantasia, e-mail do proprietário, telefone, cidade, segmento.
- [ ] `[DOC]` Fluxo: criar `empresas` + convite/criação Auth + `empresa_membros` + seed `menu_store_state` em uma tela.

## D2 — Implementação (quando priorizar)

- [ ] `[CÓDIGO]` Rota `/admin/sistema` (ou similar) protegida por papel `super_admin`.
- [ ] `[CÓDIGO]` Formulário com validação de slug único e preview da URL pública.
- [ ] `[CÓDIGO]` Opção “2ª unidade”: selecionar usuário existente por e-mail (sem criar Auth novo).
- [ ] `[TESTE]` Loja criada pela UI passa no checklist A3 sem SQL manual.
- [ ] `[DOC]` Atualizar este GO_LIVE: bloco A2 vira opcional quando D estiver pronto.

**Bloco D pronto quando:** nova loja sobe em < 10 min sem abrir SQL Editor.

---

# Referência rápida — 2ª unidade (cliente existente)

| Passo | Ação |
|-------|------|
| 1 | Novo `slug` + INSERT `empresas` |
| 2 | **Não** criar novo Auth (salvo outro dono) |
| 3 | INSERT `empresa_membros` (mesmo `usuario_id`, novo `empresa_id`) |
| 4 | Novo `menu_store_state` para o slug |
| 5 | Configurar admin + testar `/{slug}` |

---

# Referência — o que **não** entra neste checklist (propositalmente)

Não são tarefas deste arquivo: ambiente Supabase dev separado, Sentry, uptime pago, fidelidade, estoque, NF-e, integração iFood/Rappi, gateway automático, app nativo.  
Ver conversa de escopo “não é o Nimbus”.

---

# Histórico

| Data | Loja (slug) | Bloco concluído | Responsável | Notas |
|------|-------------|-----------------|-------------|-------|
| | | | | |

---

*Última atualização: checklist criado para piloto com domínio personalizado. Alinhar com `supabase/README.md` e scripts em `supabase/scripts/`.*
