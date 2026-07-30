from __future__ import annotations

import asyncio
from typing import Any
from urllib.parse import urlparse

from .anota_parser import parse_anota_payload
from .base import ExtractResult, MenuCategory, merge_category_lists
from .browser import (
    assert_page_not_blocked,
    collect_json_listener,
    dismiss_common_modals,
    open_browser_page,
    scroll_page,
)


async def _dom_fallback(page) -> list[MenuCategory]:
    script = """
    () => {
      const cats = [];
      const seen = new Set();
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, [class*="categor"]'));
      for (const h of headings) {
        const title = (h.innerText || '').trim();
        if (!title || title.length > 80) continue;
        let root = h.closest('section, div') || h.parentElement;
        if (!root) continue;
        const items = [];
        const cards = root.querySelectorAll('[class*="product"], [class*="item"], [class*="produto"], li, article');
        for (const card of cards) {
          const nameEl = card.querySelector('h3, h4, h5, [class*="title"], [class*="name"], [class*="nome"]');
          const name = (nameEl?.innerText || card.querySelector('strong')?.innerText || '').trim();
          if (!name || name.length < 2) continue;
          const desc = (card.querySelector('p, [class*="desc"]')?.innerText || '').trim();
          const priceText = (card.innerText || '').match(/R\\$\\s*[\\d.,]+/);
          const img = card.querySelector('img');
          const key = title + '|' + name;
          if (seen.has(key)) continue;
          seen.add(key);
          items.push({
            nome: name,
            descricao: desc.slice(0, 500),
            preco: priceText ? priceText[0] : null,
            imagem: img?.src || '',
          });
        }
        if (items.length) cats.push({ nome: title, itens: items });
      }
      return cats;
    }
    """
    raw = await page.evaluate(script)
    return parse_anota_payload(raw or [])


async def extract_anota_ai(url: str) -> ExtractResult:
    warnings: list[str] = []
    hints: list[str] = []
    bag: list[tuple[str, Any]] = []
    store_name = ""

    p = browser = page = None
    try:
        p, browser, _context, page = await open_browser_page()
        page.on("response", collect_json_listener(bag))

        await page.goto(url, wait_until="domcontentloaded", timeout=90_000)
        await page.wait_for_timeout(2500)
        await assert_page_not_blocked(page)
        html = await page.content()
        if "cloudflare" in html.lower() and (
            "blocked" in html.lower() or "attention required" in html.lower()
        ):
            raise RuntimeError(
                "Cloudflare bloqueou o acesso a partir deste ambiente. "
                "Rode a ferramenta na sua máquina local ou use a aba “Colar JSON bruto”."
            )
        await dismiss_common_modals(page)
        await scroll_page(page, rounds=12)

        try:
            store_name = (await page.title() or "").split("|")[0].strip()
            h1 = page.locator("h1").first
            if await h1.count():
                text = (await h1.inner_text()).strip()
                if text:
                    store_name = text
        except Exception:
            pass

        try:
            chips = page.locator(
                '[class*="categor"] button, [class*="menu"] a, nav a, [role="tab"]'
            )
            count = min(await chips.count(), 30)
            for i in range(count):
                try:
                    await chips.nth(i).click(timeout=700)
                    await page.wait_for_timeout(220)
                except Exception:
                    continue
        except Exception:
            pass

        await scroll_page(page, rounds=8)
        await page.wait_for_timeout(1000)

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
        cats = parse_anota_payload(data)
        if cats and sum(len(c.itens) for c in cats) >= 1:
            hints.append(f"payload:{urlparse(resp_url).path[:90]}")
            parsed_lists.append(cats)

    categories = (
        merge_category_lists(*parsed_lists, dom_categories)
        if (parsed_lists or dom_categories)
        else []
    )

    if not categories:
        raise RuntimeError(
            "Não foi possível extrair produtos da Anota AI. "
            "Use a URL pública (ex.: https://pedido.anota.ai/loja/seu-slug). "
            "Se o Cloudflare bloquear (comum em servidores), rode localmente ou "
            "cole o JSON bruto do cardápio na aba correspondente."
        )

    for cat in categories:
        for item in cat.itens:
            warnings.extend(item.avisos)

    if not any(i.imagem_url for c in categories for i in c.itens):
        warnings.append("Nenhuma imagem de produto encontrada.")

    return ExtractResult(
        platform="anota_ai",
        source_url=url,
        store_name=store_name,
        categories=categories,
        warnings=warnings,
        raw_hints=hints,
    )


def extract_anota_ai_sync(url: str) -> ExtractResult:
    return asyncio.run(extract_anota_ai(url))
