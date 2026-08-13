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
from adapters.generic import parse_json_ld_menu
from adapters.ifood_parser import parse_ifood_catalog_payload
from nimbus_export import build_nimbus_payload
from validate_nimbus_payload import validate_payload


def test_detect():
    assert detect_platform("https://www.ifood.com.br/delivery/sp/loja/uuid") == "ifood"
    assert detect_platform("https://pedido.anota.ai/loja/minha-loja") == "anota_ai"
    assert detect_platform("https://pedir.delivery/app/kumbucas/menu") == "generic"


def test_ifood_site_api_fixture():
    raw = json.loads((ROOT / "examples" / "ifood_site_api_catalog.json").read_text(encoding="utf-8"))
    cats = parse_ifood_catalog_payload(raw, merchant_id="abc-123")
    assert len(cats) == 2
    result = extract_from_raw_payload("ifood", raw, merchant_id="abc-123")
    assert not validate_payload(build_nimbus_payload(result))


def test_anota_fixture():
    raw = json.loads((ROOT / "examples" / "anota_catalog.json").read_text(encoding="utf-8"))
    cats = parse_anota_payload(raw)
    assert len(cats) == 2
    assert not validate_payload(build_nimbus_payload(extract_from_raw_payload("anota_ai", raw)))


def test_json_ld_generic():
    raw = json.loads((ROOT / "examples" / "generic_json_ld.json").read_text(encoding="utf-8"))
    cats = parse_json_ld_menu([raw], "https://exemplo.com/cardapio")
    assert len(cats) == 2
    assert sum(len(c.itens) for c in cats) == 3
    payload = build_nimbus_payload(extract_from_raw_payload("generic", raw))
    assert not validate_payload(payload)
    assert sum(len(c["itens"]) for c in payload["modules"]["produtos"]["categorias"]) == 3


def test_sample_file():
    sample = json.loads((ROOT / "examples" / "sample_nimbus_payload.json").read_text(encoding="utf-8"))
    assert not validate_payload(sample)


def test_multipedidos_extras():
    import httpx
    from adapters.generic import parse_multipedidos_full

    raw = httpx.get(
        "https://cardapio.multipedidos.com.br/kumbucas/cardapio.json",
        timeout=30,
    ).json()
    products, addons = parse_multipedidos_full(raw)
    assert len(products) >= 1
    assert len(addons) >= 5, f"esperava varios extras, veio {len(addons)}"
    assert sum(len(a.itens) for a in addons) >= 20
    # produto com extras linkados por nome
    linked = [i for c in products for i in c.itens if i.adicional_categorias]
    assert linked, "produtos deveriam referenciar categorias de adicional"
    result = extract_from_raw_payload("generic", raw, source_url="https://pedir.delivery/app/kumbucas/menu")
    payload = build_nimbus_payload(result, slug="kumbucas")
    assert not validate_payload(payload)
    assert "adicionais" in payload["modules"]
    assert len(payload["modules"]["adicionais"]["categorias"]) >= 5


def main() -> int:
    test_detect()
    test_ifood_site_api_fixture()
    test_anota_fixture()
    test_json_ld_generic()
    test_sample_file()
    test_multipedidos_extras()
    print("OK - parsers e contrato Nimbus")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
