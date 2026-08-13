# Extrator de cardápio (iFood + Anota AI + genérico)

Ferramenta **interna** para onboarding: cola a URL do cardápio antigo e gera JSON
compatível com o import do super-admin Nimbus.

## Modos

- **Automático**: iFood / Anota AI se detectar o domínio; senão genérico
- **Genérico**: qualquer site (JSON-LD, APIs de rede, DOM). Inclui suporte a
  `pedir.delivery` / Multipedidos (`cardapio.json`)
- Adapters dedicados: iFood e Anota AI

## Fotos em ZIP

Depois de extrair, use **Baixar fotos (ZIP)**. O arquivo vem com:

- `produtos/<categoria>/001-nome.jpg`
- `adicionais/<categoria>/...` (quando houver)
- `manifest.json` (mapa arquivo → nome/URL)

## Windows

1. `setup.bat` (primeira vez)
2. `run.bat`
3. Abra http://127.0.0.1:8765 (Ctrl+F5 se a tela antiga ainda aparecer)

## Fluxo

1. Cole a URL (ex.: `https://pedir.delivery/app/loja/menu`)
2. Modo **Automático** ou **Genérico**
3. Extrair → revisar → baixar JSON → importar no super-admin (dry run)

Sempre revise preços e descrições antes do import.
