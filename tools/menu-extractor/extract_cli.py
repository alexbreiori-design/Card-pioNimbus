#!/usr/bin/env python3
"""CLI: extrai cardápio e grava JSON Nimbus."""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

from adapters import detect_platform, extract_from_raw_payload, extract_menu
from nimbus_export import build_nimbus_payload, summarize_payload
from validate_nimbus_payload import validate_payload


async def run_url(url: str, slug: str, out: Path) -> int:
    result = await extract_menu(url)
    payload = build_nimbus_payload(result, slug=slug)
    errors = validate_payload(payload)
    if errors:
        print("JSON inválido:", *errors, sep="\n - ", file=sys.stderr)
        return 1
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    counts = summarize_payload(payload)
    print(f"OK → {out} ({counts['categorias']} categorias, {counts['produtos']} produtos)")
    for w in result.warnings[:20]:
        print(f"aviso: {w}")
    return 0


def run_raw(platform: str, raw_path: Path, slug: str, merchant_id: str | None, out: Path) -> int:
    payload_in = json.loads(raw_path.read_text(encoding="utf-8"))
    result = extract_from_raw_payload(platform, payload_in, merchant_id=merchant_id)
    payload = build_nimbus_payload(result, slug=slug)
    errors = validate_payload(payload)
    if errors:
        print("JSON inválido:", *errors, sep="\n - ", file=sys.stderr)
        return 1
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    counts = summarize_payload(payload)
    print(f"OK → {out} ({counts['categorias']} categorias, {counts['produtos']} produtos)")
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Extrator de cardápio → JSON Nimbus")
    parser.add_argument("--url", help="URL pública iFood ou Anota AI")
    parser.add_argument("--raw", help="Arquivo JSON bruto (DevTools)")
    parser.add_argument("--platform", choices=["ifood", "anota_ai"], help="Obrigatório com --raw")
    parser.add_argument("--merchant-id", default=None, help="UUID iFood para imagens")
    parser.add_argument("--slug", default="", help="Slug da loja Nimbus")
    parser.add_argument("-o", "--output", default="nimbus-catalog.json")
    args = parser.parse_args(argv)

    out = Path(args.output)
    if args.raw:
        if not args.platform:
            print("--platform é obrigatório com --raw", file=sys.stderr)
            return 2
        return run_raw(args.platform, Path(args.raw), args.slug, args.merchant_id, out)
    if not args.url:
        print("Informe --url ou --raw", file=sys.stderr)
        return 2
    detect_platform(args.url)
    return asyncio.run(run_url(args.url, args.slug, out))


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
