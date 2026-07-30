# Extrator de cardápio (iFood + Anota AI)

Ferramenta **interna** para onboarding: cola a URL pública do cardápio antigo,
extrai categorias/produtos e gera JSON no formato do import do super-admin Nimbus.

## Escopo MVP

- Plataformas: **iFood** e **Anota AI**
- Campos: categoria, nome, descrição, preço, `imagemUrl` (quando houver)
- Não cobre adicionais, pizza modular nem marmitas

## Requisitos

- Python 3.10+
- Playwright (Chromium)

## Instalação

```bash
cd tools/menu-extractor
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

## Uso (CLI)

```bash
# Por URL
python extract_cli.py --url 'https://www.ifood.com.br/delivery/.../<uuid>' -o loja.json

# Por JSON bruto
python extract_cli.py --raw examples/ifood_site_api_catalog.json --platform ifood --merchant-id abc -o loja.json
```

## Uso (UI)

```bash
cd tools/menu-extractor
source .venv/bin/activate
python app.py
```

Abra http://127.0.0.1:8765

1. Cole a URL pública (iFood com UUID, ou `https://pedido.anota.ai/loja/...`)
2. (Opcional) informe o slug da loja Nimbus
3. Clique em **Extrair**
4. Revise avisos / preview
5. **Baixar JSON** ou copiar
6. No super-admin Nimbus → import de cardápio → cole o JSON → **dry run** → import

### Fallback: JSON bruto

Se PerimeterX (iFood) ou Cloudflare (Anota AI) bloquear o ambiente:

1. Abra a URL no Chrome normal
2. DevTools → Network → filtre por `catalog` (iFood) ou a API de cardápio (Anota)
3. Copie o Response JSON
4. Na UI, aba **Colar JSON bruto** → cole → Extrair

## Validar formato do JSON (sem rede)

```bash
python validate_nimbus_payload.py examples/sample_nimbus_payload.json
python test_parsers.py
```

## Observações

- Use só com autorização do lojista (migração do próprio cardápio).
- Anti-bot das plataformas é comum em datacenters; preferir rodar na máquina local.
- Layouts/APIs mudam; se a extração falhar, ajuste os adapters ou use JSON bruto.
- Sempre revise preços e descrições antes do import.
