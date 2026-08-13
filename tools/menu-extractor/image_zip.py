from __future__ import annotations

import io
import re
import zipfile
from typing import Any
from urllib.parse import urlparse

import httpx

SAFE_NAME = re.compile(r"[^a-zA-Z0-9._\- ]+")


def _slugify(value: str, fallback: str = "item") -> str:
    text = SAFE_NAME.sub("", str(value or "").strip()).strip(" ._")
    text = re.sub(r"\s+", "-", text)
    return (text[:80] or fallback).lower()


def _ext_from_url_or_content(url: str, content_type: str = "") -> str:
    path = urlparse(url).path.lower()
    for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        if path.endswith(ext):
            return ".jpg" if ext == ".jpeg" else ext
    ct = (content_type or "").lower()
    if "png" in ct:
        return ".png"
    if "webp" in ct:
        return ".webp"
    if "gif" in ct:
        return ".gif"
    return ".jpg"


def collect_image_entries(payload: dict[str, Any]) -> list[dict[str, str]]:
    """Lista imagens do JSON Nimbus (produtos + adicionais)."""
    entries: list[dict[str, str]] = []
    seen_urls: set[str] = set()

    modules = payload.get("modules") or {}

    for cat in (modules.get("produtos") or {}).get("categorias") or []:
        cat_name = str(cat.get("nome") or "produtos")
        for item in cat.get("itens") or []:
            url = str(item.get("imagemUrl") or "").strip()
            if not url.startswith("http") or url in seen_urls:
                continue
            seen_urls.add(url)
            entries.append(
                {
                    "folder": "produtos",
                    "categoria": cat_name,
                    "nome": str(item.get("nome") or "produto"),
                    "url": url,
                }
            )

    for cat in (modules.get("adicionais") or {}).get("categorias") or []:
        cat_name = str(cat.get("nome") or "adicionais")
        for item in cat.get("itens") or []:
            url = str(item.get("imagemUrl") or "").strip()
            if not url.startswith("http") or url in seen_urls:
                continue
            seen_urls.add(url)
            entries.append(
                {
                    "folder": "adicionais",
                    "categoria": cat_name,
                    "nome": str(item.get("nome") or "adicional"),
                    "url": url,
                }
            )

    return entries


def build_images_zip(
    payload: dict[str, Any],
    *,
    timeout_s: float = 25.0,
    max_images: int = 400,
) -> tuple[bytes, dict[str, Any]]:
    """
    Baixa imagens do payload e devolve (zip_bytes, meta).
    meta: { total, downloaded, failed, failures: [...] }
    """
    entries = collect_image_entries(payload)[:max_images]
    failures: list[str] = []
    downloaded = 0
    used_names: set[str] = set()
    manifest: list[dict[str, str]] = []

    buf = io.BytesIO()
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    }

    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        with httpx.Client(timeout=timeout_s, follow_redirects=True, headers=headers) as client:
            for index, entry in enumerate(entries, start=1):
                url = entry["url"]
                base = (
                    f"{_slugify(entry['categoria'], 'cat')}/"
                    f"{index:03d}-{_slugify(entry['nome'], 'item')}"
                )
                try:
                    response = client.get(url)
                    if response.status_code >= 400:
                        failures.append(f"{entry['nome']}: HTTP {response.status_code}")
                        continue
                    content = response.content
                    if not content or len(content) < 64:
                        failures.append(f"{entry['nome']}: arquivo vazio")
                        continue
                    ext = _ext_from_url_or_content(url, response.headers.get("content-type", ""))
                    filename = f"{entry['folder']}/{base}{ext}"
                    # evita colisão
                    n = 2
                    while filename.lower() in used_names:
                        filename = f"{entry['folder']}/{base}-{n}{ext}"
                        n += 1
                    used_names.add(filename.lower())
                    zf.writestr(filename, content)
                    downloaded += 1
                    manifest.append(
                        {
                            "arquivo": filename,
                            "nome": entry["nome"],
                            "categoria": entry["categoria"],
                            "tipo": entry["folder"],
                            "url": url,
                        }
                    )
                except Exception as exc:
                    failures.append(f"{entry['nome']}: {exc}")

        import json

        zf.writestr(
            "manifest.json",
            json.dumps(
                {
                    "totalUrls": len(entries),
                    "downloaded": downloaded,
                    "failed": len(failures),
                    "itens": manifest,
                    "falhas": failures,
                },
                ensure_ascii=False,
                indent=2,
            ),
        )

    meta = {
        "total": len(entries),
        "downloaded": downloaded,
        "failed": len(failures),
        "failures": failures[:40],
    }
    return buf.getvalue(), meta
