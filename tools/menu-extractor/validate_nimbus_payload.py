#!/usr/bin/env python3
"""Valida JSON de import Nimbus (módulo produtos) espelhando regras do catalog-import."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


def parse_import_price(value: Any) -> float:
    if value == "" or value is None:
        return 0.0
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return max(0.0, float(value))
    text = str(value).strip()
    cleaned = "".join(ch for ch in text if ch.isdigit() or ch in ",.-")
    if not cleaned:
        return float("nan")
    if "," in cleaned:
        normalized = cleaned.replace(".", "").replace(",", ".")
    else:
        normalized = cleaned
    try:
        return max(0.0, float(normalized))
    except ValueError:
        return float("nan")


def validate_payload(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    version = payload.get("version")
    if version != 1:
        errors.append(f'version deve ser 1 (recebido: {version!r}).')

    modules = payload.get("modules")
    if not isinstance(modules, dict):
        errors.append("modules ausente ou inválido.")
        return errors

    produtos = modules.get("produtos")
    if produtos is None:
        errors.append("modules.produtos é obrigatório neste extrator.")
        return errors
    if not isinstance(produtos, dict):
        errors.append("modules.produtos inválido.")
        return errors

    cats = produtos.get("categorias")
    if not isinstance(cats, list) or not cats:
        errors.append("modules.produtos.categorias deve ser uma lista não vazia.")
        return errors

    for cat_index, raw_cat in enumerate(cats):
        if not isinstance(raw_cat, dict):
            errors.append(f"Produtos: categoria #{cat_index + 1} inválida.")
            continue
        nome = str(raw_cat.get("nome") or "").strip()
        if not nome:
            errors.append(f"Produtos: categoria #{cat_index + 1} sem nome.")
            continue
        itens = raw_cat.get("itens")
        if not isinstance(itens, list):
            errors.append(f'Produtos: categoria "{nome}" sem lista de itens.')
            continue
        for raw_item in itens:
            if not isinstance(raw_item, dict):
                errors.append(f'Produtos: item inválido na categoria "{nome}".')
                continue
            item_nome = str(raw_item.get("nome") or "").strip()
            if not item_nome:
                errors.append(f'Produtos: item sem nome na categoria "{nome}".')
                continue
            preco = parse_import_price(raw_item.get("preco"))
            if preco != preco:  # NaN
                errors.append(f'Produtos: preço inválido em "{item_nome}" ({nome}).')

    return errors


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("Uso: python validate_nimbus_payload.py <arquivo.json>")
        return 2
    path = Path(argv[1])
    payload = json.loads(path.read_text(encoding="utf-8"))
    errors = validate_payload(payload)
    if errors:
        print("FAIL")
        for err in errors:
            print(f" - {err}")
        return 1
    cats = payload["modules"]["produtos"]["categorias"]
    products = sum(len(c.get("itens") or []) for c in cats)
    print(f"OK — {len(cats)} categorias, {products} produtos")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
