# Domínio e rotas — Cardápio Nimbus

Domínio oficial do produto: **[cardapionimbus.com.br](https://cardapionimbus.com.br)**

Não usar `sistemasnimbus.com.br` — referências antigas foram removidas do código e da documentação.

---

## Variável canônica

| Variável | Exemplo | Uso |
|----------|---------|-----|
| `NEXT_PUBLIC_SITE_URL` | `https://cardapionimbus.com.br` | Metadata, Open Graph, links absolutos |

Em local: `http://localhost:3010` (ou omitir — o app usa fallback da Vercel/dev).

---

## Mapa de rotas públicas

| Rota | Público | Descrição |
|------|---------|-----------|
| `/home` | Visitante | Landing comercial (placeholder; vitrine futura) |
| `/login` | Lojista | Login do painel admin |
| `/{slug}` | Cliente final | Cardápio online da loja |
| `/` | Cliente / redirect | Cardápio da loja padrão (`NEXT_PUBLIC_DEFAULT_STORE_SLUG`) |
| `/privacidade` | Todos | Política de privacidade |
| `/termos` | Todos | Termos de uso |
| `/cadastro` | — | Reservado; não divulgar até existir fluxo |

## Rotas internas

| Rota | Quem | Descrição |
|------|------|-----------|
| `/admin/*` | Lojista | Painel da loja (pedidos, produtos, etc.) |
| `/admin/sistema` | Super-admin Nimbus | Gestão de lojas, relatórios, configurações |

---

## Super-admin

- Acesso: e-mails em `NIMBUS_SUPER_ADMIN_EMAILS` (padrão configurado no deploy).
- URL: `https://cardapionimbus.com.br/admin/sistema`
- Perfil e WhatsApp de suporte: **Configurações** no super-admin → reflete no link **Suporte** da sidebar dos lojistas.

---

## Deploy (Vercel)

1. Apontar `cardapionimbus.com.br` (apex e/ou `www`) para o projeto.
2. Definir `NEXT_PUBLIC_SITE_URL=https://cardapionimbus.com.br` em Production.
3. Smoke: abrir `/home`, `/login` e `/{slug-piloto}` em HTTPS.

---

## Referências

- Variáveis: `docs/ENV.md`
- Operações: `docs/OPS.md`
- Go-live: `docs/GO_LIVE.md`
