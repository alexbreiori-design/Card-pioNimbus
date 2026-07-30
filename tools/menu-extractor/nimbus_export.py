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
            itens.append(row)
        if not itens:
            continue
        categorias.append({"nome": cat.nome, "itens": itens})

    platform_label = "iFood" if result.platform == "ifood" else "Anota AI"
    store_bit = f" ({result.store_name})" if result.store_name else ""
    notas = (
        f"Gerado por tools/menu-extractor a partir de {platform_label}{store_bit}: "
        f"{result.source_url}. Revise preços, descrições e imagens antes do import."
    )

    return {
        "version": NIMBUS_CATALOG_IMPORT_VERSION,
        "slug": slug or "",
        "notas": notas,
        "modules": {
            "produtos": {
                "categorias": categorias,
            }
        },
    }


def summarize_payload(payload: dict[str, Any]) -> dict[str, int]:
    cats = payload.get("modules", {}).get("produtos", {}).get("categorias") or []
    products = sum(len(c.get("itens") or []) for c in cats)
    return {"categorias": len(cats), "produtos": products}
