#!/usr/bin/env python3
"""Testes offline dos parsers (sem Playwright / rede)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from adapters.anota_parser import parse_anota_payload
from adapters.base import ExtractResult, MenuCategory, MenuItem, detect_platform, extract_from_raw_payload
from adapters.ifood_parser import parse_ifood_catalog_payload
from nimbus_export import build_nimbus_payload
from validate_nimbus_payload import validate_payload


def test_detect():
    assert detect_platform("https://www.ifood.com.br/delivery/sp/loja/uuid") == "ifood"
    assert detect_platform("https://pedido.anota.ai/loja/minha-loja") == "anota_ai"
    try:
        detect_platform("https://example.com/menu")
        raise AssertionError("deveria falhar")
    except ValueError:
        pass


def test_ifood_site_api_fixture():
    raw = json.loads((ROOT / "examples" / "ifood_site_api_catalog.json").read_text())
    cats = parse_ifood_catalog_payload(raw, merchant_id="abc-123")
    assert len(cats) == 2
    bolos = next(c for c in cats if c.nome == "Bolos")
    assert bolos.itens[0].nome == "Bolo de Chocolate"
    assert bolos.itens[0].preco == 49.9
    assert "static-images.ifood.com.br" in bolos.itens[0].imagem_url
    assert "Massa de chocolate" in bolos.itens[0].descricao

    result = extract_from_raw_payload("ifood", raw, merchant_id="abc-123")
    payload = build_nimbus_payload(result, slug="doceria")
    errors = validate_payload(payload)
    assert not errors, errors
    assert payload["modules"]["produtos"]["categorias"][0]["itens"][0]["nome"] == "Bolo de Chocolate"


def test_anota_fixture():
    raw = json.loads((ROOT / "examples" / "anota_catalog.json").read_text())
    cats = parse_anota_payload(raw)
    assert len(cats) == 2
    combos = next(c for c in cats if c.nome == "Combos")
    assert combos.itens[0].preco == 89.9
    result = extract_from_raw_payload("anota_ai", raw)
    payload = build_nimbus_payload(result)
    assert not validate_payload(payload)


def test_nimbus_export_valid():
    result = ExtractResult(
        platform="ifood",
        source_url="https://www.ifood.com.br/delivery/x",
        store_name="Teste",
        categories=[
            MenuCategory(
                nome="Burgers",
                itens=[
                    MenuItem(
                        nome="Classic",
                        preco=32.9,
                        descricao="desc",
                        imagem_url="https://x/y.jpg",
                    )
                ],
            )
        ],
    )
    payload = build_nimbus_payload(result, slug="teste")
    errors = validate_payload(payload)
    assert not errors, errors


def test_sample_file():
    sample = json.loads((ROOT / "examples" / "sample_nimbus_payload.json").read_text())
    errors = validate_payload(sample)
    assert not errors, errors


def main() -> int:
    test_detect()
    test_ifood_site_api_fixture()
    test_anota_fixture()
    test_nimbus_export_valid()
    test_sample_file()
    print("OK — parsers e contrato Nimbus")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
