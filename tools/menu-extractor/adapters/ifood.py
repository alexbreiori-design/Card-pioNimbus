from __future__ import annotations

import asyncio
import re
from typing import Any
from urllib.parse import urlparse

from .base import ExtractResult, MenuCategory, merge_category_lists
from .browser import (
    assert_page_not_blocked,
    collect_json_listener,
    dismiss_common_modals,
    open_browser_page,
    scroll_page,
)
from .ifood_parser import looks_like_ifood_catalog, parse_ifood_catalog_payload


def merchant_uuid_from_url(url: str) -> str | None:
    match = re.search(
        r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})",
        url,
        re.I,
    )
    return match.group(1) if match else None


async def _dom_fallback(page) -> list[MenuCategory]:
    script = """
    () => {
      const cats = [];
      const seen = new Set();
      const badTitle = /(avalia|sobre|informa|horario|endere|cupom|facebook|instagram|twitter|youtube|ajuda|conta|carreira|entregador)/i;
      const headings = Array.from(document.querySelectorAll('h2, h3'));
      for (const h of headings) {
        const title = (h.innerText || '').trim();
        if (!title || title.length > 60 || badTitle.test(title)) continue;
        let root = h.closest('section') || h.parentElement;
        if (!root) continue;
        const items = [];
        const cards = root.querySelectorAll('[class*="dish"], [data-test*="dish"], li, article');
        for (const card of cards) {
          const nameEl = card.querySelector('h3, h4, [class*="title"], [class*="name"]');
          const name = (nameEl?.innerText || '').trim();
          if (!name || name.length < 2 || name.length > 120) continue;
          if (/facebook|instagram|youtube|twitter/i.test(name)) continue;
          const descEl = card.querySelector('p, [class*="description"], [class*="desc"]');
          const desc = (descEl?.innerText || '').trim();
          const priceMatch = (card.innerText || '').match(/R\\$\\s*[\\d.,]+/);
          if (!priceMatch) continue;
          const img = card.querySelector('img');
          const key = title + '|' + name;
          if (seen.has(key)) continue;
          seen.add(key);
          items.push({
            name,
            details: desc.slice(0, 500),
            unitPrice: priceMatch[0],
            image: img?.src || '',
          });
        }
        if (items.length >= 1) cats.push({ name: title, itens: items });
      }
      return cats;
    }
    """
    raw = await page.evaluate(script)
    return parse_ifood_catalog_payload({"menu": raw or []})


def _is_weak_extraction(categories: list[MenuCategory], had_catalog_json: bool) -> bool:
    if had_catalog_json:
        return False
    products = [i for c in categories for i in c.itens]
    if not products:
        return True
    priced = sum(1 for i in products if (i.preco or 0) > 0)
    return priced < max(3, len(products) // 2)


async def _fetch_catalog_via_context(context, merchant_id: str, referer: str) -> Any | None:
    """Tenta o endpoint site-api reusando cookies do browser."""
    url = f"https://www.ifood.com.br/site-api/v1/merchants/restaurant/{merchant_id}/catalog"
    try:
        response = await context.request.get(
            url,
            headers={
                "Accept": "application/json, text/plain, */*",
                "Referer": referer,
                "Origin": "https://www.ifood.com.br",
            },
            timeout=45_000,
        )
        if response.status != 200:
            return None
        data = await response.json()
        if looks_like_ifood_catalog(url, data):
            return data
    except Exception:
        return None
    return None


async def extract_ifood(url: str) -> ExtractResult:
    warnings: list[str] = []
    hints: list[str] = []
    categories: list[MenuCategory] = []
    store_name = ""
    merchant_id = merchant_uuid_from_url(url)
    if merchant_id:
        hints.append(f"merchantId={merchant_id}")
    else:
        warnings.append(
            "URL sem UUID do merchant. Prefira o link completo "
            "(…/delivery/cidade/slug/<uuid>)."
        )

    bag: list[tuple[str, Any]] = []
    p = browser = context = page = None
    try:
        p, browser, context, page = await open_browser_page()
        page.on("response", collect_json_listener(bag))

        await page.goto(url, wait_until="domcontentloaded", timeout=90_000)
        await page.wait_for_timeout(2000)
        await assert_page_not_blocked(page)
        await dismiss_common_modals(page)
        await scroll_page(page, rounds=10)

        try:
            store_name = (await page.title() or "").split("|")[0].split("-")[0].strip()
        except Exception:
            store_name = ""

        # Aguarda um pouco mais por /catalog
        for _ in range(20):
            if any(looks_like_ifood_catalog(u, d) for u, d in bag):
                break
            await page.wait_for_timeout(400)

        await scroll_page(page, rounds=6)

        # Fetch direto com cookies da sessão
        if merchant_id:
            direct = await _fetch_catalog_via_context(context, merchant_id, url)
            if direct is not None:
                bag.append(
                    (
                        f"https://www.ifood.com.br/site-api/v1/merchants/restaurant/{merchant_id}/catalog",
                        direct,
                    )
                )
                hints.append("site-api/catalog via context.request")

        dom_categories: list[MenuCategory] = []
        try:
            dom_categories = await _dom_fallback(page)
            if dom_categories:
                hints.append("dom-fallback")
        except Exception:
            dom_categories = []

    finally:
        if browser:
            await browser.close()
        if p:
            await p.stop()

    parsed_lists: list[list[MenuCategory]] = []
    for resp_url, data in bag:
        if looks_like_ifood_catalog(resp_url, data) or "/merchant" in resp_url.lower():
            cats = parse_ifood_catalog_payload(data, merchant_id)
            if cats:
                hints.append(f"payload:{urlparse(resp_url).path[:90]}")
                parsed_lists.append(cats)

    # também tenta parsers em qualquer JSON capturado
    if not parsed_lists:
        for resp_url, data in bag:
            cats = parse_ifood_catalog_payload(data, merchant_id)
            if cats:
                hints.append(f"payload-heuristic:{urlparse(resp_url).path[:90]}")
                parsed_lists.append(cats)

    categories = merge_category_lists(*parsed_lists, dom_categories) if (parsed_lists or dom_categories) else []
    had_catalog_json = bool(parsed_lists)

    if not categories or _is_weak_extraction(categories, had_catalog_json):
        raise RuntimeError(
            "Não foi possível capturar o JSON de catálogo do iFood "
            f"(/site-api/v1/merchants/restaurant/{merchant_id or '<uuid>'}/catalog). "
            "Isso costuma acontecer com anti-bot em servidores. "
            "Rode na sua máquina local ou, no Chrome, copie a resposta de /catalog "
            "e use a aba “Colar JSON bruto”."
        )

    if not had_catalog_json:
        warnings.append(
            "Extração via DOM (sem JSON /catalog). Revise com cuidado antes do import."
        )

    for cat in categories:
        for item in cat.itens:
            warnings.extend(item.avisos)

    if not any(i.imagem_url for c in categories for i in c.itens):
        warnings.append("Nenhuma imagem de produto encontrada.")

    return ExtractResult(
        platform="ifood",
        source_url=url,
        store_name=store_name,
        categories=categories,
        warnings=warnings,
        raw_hints=hints,
    )


def extract_ifood_sync(url: str) -> ExtractResult:
    return asyncio.run(extract_ifood(url))
