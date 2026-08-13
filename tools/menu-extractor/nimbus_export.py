from __future__ import annotations

from typing import Any

from adapters.base import ExtractResult

NIMBUS_CATALOG_IMPORT_VERSION = 1


def build_nimbus_payload(result: ExtractResult, slug: str = "") -> dict[str, Any]:
    categorias = []
    for cat in result.categories:
        itens = []
        for item in cat.itens:
            row: dict[str, Any] = {
                "nome": item.nome,
                "preco": float(item.preco if item.preco is not None else 0),
                "descricao": item.descricao or "",
                "tipo": "comum",
            }
            if item.imagem_url:
                row["imagemUrl"] = item.imagem_url
            # Nota amigável: nomes dos grupos de adicional ligados no origem
            if item.adicional_categorias:
                row["notasAdicionais"] = ", ".join(item.adicional_categorias)
            itens.append(row)
        if not itens:
            continue
        categorias.append({"nome": cat.nome, "itens": itens})

    modules: dict[str, Any] = {
        "produtos": {
            "categorias": categorias,
        }
    }

    if result.addon_categories:
        add_cats = []
        for cat in result.addon_categories:
            add_itens = []
            for item in cat.itens:
                add_row: dict[str, Any] = {
                    "nome": item.nome,
                    "preco": float(item.preco if item.preco is not None else 0),
                    "descricao": item.descricao or "",
                }
                if item.imagem_url:
                    add_row["imagemUrl"] = item.imagem_url
                add_itens.append(add_row)
            if not add_itens:
                continue
            add_cats.append(
                {
                    "nome": cat.nome,
                    "obrigatorio": bool(cat.obrigatorio),
                    "min": int(cat.min),
                    "max": int(cat.max),
                    "tipoSelecao": "simples" if cat.tipo_selecao == "simples" else "multipla",
                    "itens": add_itens,
                }
            )
        if add_cats:
            modules["adicionais"] = {"categorias": add_cats}

    platform_label = {
        "ifood": "iFood",
        "anota_ai": "Anota AI",
        "generic": "site genérico",
    }.get(result.platform, result.platform)
    store_bit = f" ({result.store_name})" if result.store_name else ""
    notas = (
        f"Gerado por tools/menu-extractor a partir de {platform_label}{store_bit}: "
        f"{result.source_url}. Revise preços, descrições, imagens e vínculos de "
        f"adicionais antes do import."
    )

    return {
        "version": NIMBUS_CATALOG_IMPORT_VERSION,
        "slug": slug or "",
        "notas": notas,
        "modules": modules,
    }


def summarize_payload(payload: dict[str, Any]) -> dict[str, int]:
    cats = payload.get("modules", {}).get("produtos", {}).get("categorias") or []
    products = sum(len(c.get("itens") or []) for c in cats)
    add_cats = payload.get("modules", {}).get("adicionais", {}).get("categorias") or []
    add_items = sum(len(c.get("itens") or []) for c in add_cats)
    return {
        "categorias": len(cats),
        "produtos": products,
        "adicionaisCategorias": len(add_cats),
        "adicionaisItens": add_items,
    }
