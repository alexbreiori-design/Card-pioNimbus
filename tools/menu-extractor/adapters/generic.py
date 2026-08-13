from __future__ import annotations

import re
from typing import Any
from urllib.parse import urljoin, urlparse

from .base import (
    AddonCategory,
    ExtractResult,
    MenuCategory,
    MenuItem,
    extract_categories_from_payload,
    merge_category_lists,
    normalize_price,
)
from .browser import (
    assert_page_not_blocked,
    collect_json_listener,
    dismiss_common_modals,
    open_browser_page,
    scroll_page,
)


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _absolute_url(base: str, maybe: str) -> str:
    if not maybe:
        return ""
    if maybe.startswith("http"):
        return maybe
    try:
        return urljoin(base, maybe)
    except Exception:
        return maybe


def parse_json_ld_menu(blocks: list[Any], page_url: str = "") -> list[MenuCategory]:
    items_by_section: dict[str, list[MenuItem]] = {}
    order: list[str] = []

    def add_item(section: str, item: MenuItem) -> None:
        key = section.strip() or "Geral"
        if key not in items_by_section:
            items_by_section[key] = []
            order.append(key)
        if not any(x.nome.lower() == item.nome.lower() for x in items_by_section[key]):
            items_by_section[key].append(item)

    def price_from_offers(node: dict[str, Any]) -> float | None:
        offers = node.get("offers") or node.get("offer")
        for offer in _as_list(offers):
            if isinstance(offer, dict):
                p = normalize_price(offer.get("price") or offer.get("lowPrice"))
                if p is not None:
                    return p
            else:
                p = normalize_price(offer)
                if p is not None:
                    return p
        return normalize_price(node.get("price"))

    def walk(node: Any, section: str = "Geral") -> None:
        if isinstance(node, list):
            for child in node:
                walk(child, section)
            return
        if not isinstance(node, dict):
            return

        types = node.get("@type") or node.get("type") or ""
        type_list = [str(t).lower() for t in (_as_list(types))]

        if any(t in ("menu", "menusection") for t in type_list):
            nome = str(node.get("name") or section or "Geral").strip() or "Geral"
            for child_key in ("hasMenuSection", "hasMenuItem", "itemListElement", "menu"):
                if child_key in node:
                    walk(node[child_key], nome)
            return

        if any(t in ("menuitem", "product", "offer") for t in type_list) or (
            node.get("name") and (node.get("offers") or node.get("price") is not None)
        ):
            nome = str(node.get("name") or "").strip()
            if len(nome) >= 2:
                preco = price_from_offers(node)
                avisos: list[str] = []
                if preco is None:
                    avisos.append(f'Item "{nome}" sem preço detectado — usando 0.')
                    preco = 0.0
                image = ""
                img = node.get("image")
                if isinstance(img, str):
                    image = _absolute_url(page_url, img)
                elif isinstance(img, list) and img:
                    first = img[0]
                    if isinstance(first, str):
                        image = _absolute_url(page_url, first)
                    elif isinstance(first, dict):
                        image = _absolute_url(page_url, str(first.get("url") or ""))
                elif isinstance(img, dict):
                    image = _absolute_url(page_url, str(img.get("url") or ""))
                add_item(
                    section,
                    MenuItem(
                        nome=nome,
                        preco=preco,
                        descricao=str(node.get("description") or "").strip(),
                        imagem_url=image,
                        avisos=avisos,
                    ),
                )

        for key, child in node.items():
            if key.startswith("@"):
                continue
            if isinstance(child, (dict, list)):
                walk(child, section)

    for block in blocks:
        walk(block)

    return [MenuCategory(nome=k, itens=items_by_section[k]) for k in order if items_by_section[k]]


def _strip_html(text: str) -> str:
    cleaned = re.sub(r"<[^>]+>", " ", text or "")
    cleaned = cleaned.replace("&nbsp;", " ").replace("&amp;", "&")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    # remove aspas extras comuns no multipedidos
    return cleaned.strip('"').strip()


def parse_multipedidos_payload(payload: Any) -> list[MenuCategory]:
    """Compat: só categorias de produtos."""
    products, _addons = parse_multipedidos_full(payload)
    return products


def parse_multipedidos_full(
    payload: Any,
) -> tuple[list[MenuCategory], list[AddonCategory]]:
    """Parser completo Multipedidos: produtos (general) + adicionais (extras)."""
    if not isinstance(payload, dict):
        return [], []

    root = payload
    if isinstance(payload.get("cardapio"), dict):
        root = payload["cardapio"]
    menu = root.get("menu") if isinstance(root, dict) else None
    if not isinstance(menu, dict):
        return [], []

    extras_raw = menu.get("extras") if isinstance(menu.get("extras"), list) else []
    extra_id_to_name: dict[Any, str] = {}
    addon_categories: list[AddonCategory] = []

    for extra in extras_raw:
        if not isinstance(extra, dict):
            continue
        nome = str(extra.get("name") or "").strip()
        if not nome:
            continue
        options = extra.get("options") or []
        if not isinstance(options, list) or not options:
            continue

        min_qty = int(extra.get("qtyMin") if extra.get("qtyMin") is not None else extra.get("qty_min") or 0)
        max_qty = extra.get("qtyMax") if extra.get("qtyMax") is not None else extra.get("qty_max")
        if max_qty is None:
            max_qty = 99
        max_qty = int(max_qty)
        if max_qty == 0:
            # Multipedidos usa 0 às vezes como "sem limite prático" em grupos tipo talher
            max_qty = max(1, len(options))

        required = bool(extra.get("required")) or min_qty > 0
        tipo = "simples" if max_qty <= 1 else "multipla"

        itens: list[MenuItem] = []
        for opt in options:
            if not isinstance(opt, dict):
                continue
            if opt.get("available") == 0:
                continue
            if opt.get("asTitle") == 1:
                continue
            opt_nome = str(opt.get("name") or "").strip()
            if len(opt_nome) < 1:
                continue
            # limpa emojis problemáticos no console mas mantém no JSON
            preco = normalize_price(opt.get("price"))
            if preco is None:
                preco = 0.0
            image_hash = str(opt.get("image") or "").strip()
            image_url = ""
            if image_hash.startswith("http"):
                image_url = image_hash
            elif image_hash:
                image_url = (
                    f"https://images.multipedidos.com.br/products/"
                    f"{image_hash}/thumb_{image_hash}.jpg"
                )
            itens.append(
                MenuItem(
                    nome=opt_nome,
                    preco=preco,
                    descricao=_strip_html(str(opt.get("description") or "")),
                    imagem_url=image_url,
                )
            )

        if not itens:
            continue

        if extra.get("id") is not None:
            extra_id_to_name[extra.get("id")] = nome

        addon_categories.append(
            AddonCategory(
                nome=nome,
                itens=itens,
                obrigatorio=required,
                min=max(0, min_qty),
                max=max(0, max_qty),
                tipo_selecao=tipo,
            )
        )

    general = menu.get("general")
    categories: list[MenuCategory] = []
    if isinstance(general, list):
        for cat in general:
            if not isinstance(cat, dict):
                continue
            if cat.get("available") == 0:
                continue
            cat_name = str(cat.get("name") or "").strip()
            if not cat_name:
                continue
            products = cat.get("products") or []
            if not isinstance(products, list):
                continue
            itens: list[MenuItem] = []
            for prod in products:
                if not isinstance(prod, dict):
                    continue
                if prod.get("available") == 0:
                    continue
                nome = str(prod.get("name") or "").strip()
                if len(nome) < 2:
                    continue
                preco = normalize_price(prod.get("price"))
                avisos: list[str] = []
                if preco is None:
                    avisos.append(f'Item "{nome}" sem preço detectado — usando 0.')
                    preco = 0.0
                image_hash = str(prod.get("image") or "").strip()
                image_url = ""
                if image_hash.startswith("http"):
                    image_url = image_hash
                elif image_hash:
                    image_url = (
                        f"https://images.multipedidos.com.br/products/"
                        f"{image_hash}/thumb_{image_hash}.jpg"
                    )
                extra_ids = prod.get("extras") or []
                add_names: list[str] = []
                if isinstance(extra_ids, list):
                    for eid in extra_ids:
                        n = extra_id_to_name.get(eid)
                        if n and n not in add_names:
                            add_names.append(n)
                itens.append(
                    MenuItem(
                        nome=nome,
                        preco=preco,
                        descricao=_strip_html(str(prod.get("description") or "")),
                        imagem_url=image_url,
                        avisos=avisos,
                        adicional_categorias=add_names,
                    )
                )
            if itens:
                categories.append(MenuCategory(nome=cat_name, itens=itens))

    return categories, addon_categories


def score_payload_as_menu(payload: Any) -> int:
    cats = extract_categories_from_payload(payload)
    if not cats:
        return 0
    products = sum(len(c.itens) for c in cats)
    priced = sum(1 for c in cats for i in c.itens if (i.preco or 0) > 0)
    return products * 2 + priced


async def _collect_json_ld(page) -> list[Any]:
    script = """
    () => {
      const out = [];
      for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
        const text = (el.textContent || '').trim();
        if (!text) continue;
        try { out.push(JSON.parse(text)); } catch (e) {}
      }
      return out;
    }
    """
    try:
        return await page.evaluate(script) or []
    except Exception:
        return []


async def _dom_heuristic(page, page_url: str) -> list[MenuCategory]:
    script = """
    () => {
      const cats = [];
      const seen = new Set();
      const badTitle = /(avalia|sobre|informa|horario|endere|cupom|facebook|instagram|twitter|youtube|ajuda|conta|carreira|footer|politica|termo)/i;
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'));
      for (const h of headings) {
        const title = (h.innerText || '').trim();
        if (!title || title.length > 60 || badTitle.test(title)) continue;
        let root = h.closest('section, article, div') || h.parentElement;
        if (!root) continue;
        const items = [];
        const cards = root.querySelectorAll('li, article, [class*="product"], [class*="item"], [class*="produto"], [class*="dish"], [class*="card"], [class*="menu"]');
        for (const card of cards) {
          if ((card.innerText || '').length > 900) continue;
          const nameEl = card.querySelector('h3, h4, h5, [class*="title"], [class*="name"], [class*="nome"], strong');
          const name = (nameEl?.innerText || '').trim();
          if (!name || name.length < 2 || name.length > 120) continue;
          if (/facebook|instagram|youtube|twitter|whatsapp/i.test(name)) continue;
          const desc = (card.querySelector('p, [class*="desc"]')?.innerText || '').trim().slice(0, 400);
          const priceMatch = (card.innerText || '').match(/R\\$\\s*[\\d.,]+/);
          if (!priceMatch) continue;
          const img = card.querySelector('img');
          const key = title + '|' + name;
          if (seen.has(key)) continue;
          seen.add(key);
          items.push({
            name,
            description: desc,
            price: priceMatch[0],
            imageUrl: img?.currentSrc || img?.src || '',
          });
        }
        if (items.length) cats.push({ name: title, items });
      }

      if (!cats.length) {
        const flat = [];
        const cards = document.querySelectorAll('li, article, [class*="product"], [class*="item"], [class*="produto"], [class*="card"]');
        for (const card of cards) {
          const nameEl = card.querySelector('h3, h4, h5, [class*="title"], [class*="name"], strong');
          const name = (nameEl?.innerText || '').trim();
          if (!name || name.length < 2 || name.length > 120) continue;
          const priceMatch = (card.innerText || '').match(/R\\$\\s*[\\d.,]+/);
          if (!priceMatch) continue;
          const desc = (card.querySelector('p')?.innerText || '').trim().slice(0, 400);
          const img = card.querySelector('img');
          const key = name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          flat.push({
            name,
            description: desc,
            price: priceMatch[0],
            imageUrl: img?.currentSrc || img?.src || '',
          });
        }
        if (flat.length) cats.push({ name: 'Geral', items: flat });
      }
      return cats;
    }
    """
    raw = await page.evaluate(script)
    cats = extract_categories_from_payload(
        [{"name": c.get("name"), "items": c.get("items") or []} for c in (raw or [])]
    )
    for cat in cats:
        for item in cat.itens:
            if item.imagem_url and not item.imagem_url.startswith("http"):
                item.imagem_url = _absolute_url(page_url, item.imagem_url)
            elif item.imagem_url.startswith("data:"):
                item.imagem_url = ""
    return cats


def _is_weak(categories: list[MenuCategory]) -> bool:
    products = [i for c in categories for i in c.itens]
    if len(products) < 2:
        return True
    priced = sum(1 for i in products if (i.preco or 0) > 0)
    return priced < max(2, len(products) // 3)


async def extract_generic(url: str) -> ExtractResult:
    warnings: list[str] = [
        "Modo genérico: resultado aproximado. Revise nomes, preços e categorias antes do import."
    ]
    hints: list[str] = []
    bag: list[tuple[str, Any]] = []
    store_name = ""
    categories: list[MenuCategory] = []
    addon_categories: list[AddonCategory] = []
    multi_lists: list[list[MenuCategory]] = []

    p = browser = page = None
    try:
        p, browser, _context, page = await open_browser_page()
        page.on("response", collect_json_listener(bag))
        await page.goto(url, wait_until="domcontentloaded", timeout=90_000)
        await page.wait_for_timeout(2500)
        try:
            await assert_page_not_blocked(page)
        except RuntimeError as exc:
            warnings.append(str(exc))
        await dismiss_common_modals(page)
        await scroll_page(page, rounds=16)

        try:
            store_name = (await page.title() or "").split("|")[0].split("-")[0].strip()
            h1 = page.locator("h1").first
            if await h1.count():
                text = (await h1.inner_text()).strip()
                if text and len(text) < 80:
                    store_name = text
        except Exception:
            pass

        # Clicar em categorias / abas se existirem
        try:
            chips = page.locator('[role="tab"], [class*="categor"] button, [class*="categor"] a, nav a')
            count = min(await chips.count(), 25)
            for i in range(count):
                try:
                    await chips.nth(i).click(timeout=600)
                    await page.wait_for_timeout(200)
                except Exception:
                    continue
        except Exception:
            pass

        await scroll_page(page, rounds=8)

        ld_blocks = await _collect_json_ld(page)
        ld_cats = parse_json_ld_menu(ld_blocks, url)
        if ld_cats:
            hints.append("json-ld")
            categories = merge_category_lists(categories, ld_cats)

        # Multipedidos / pedir.delivery (cardapio.json)
        for resp_url, data in bag:
            products, addons = parse_multipedidos_full(data)
            is_multi_url = (
                "cardapio.json" in resp_url.lower() or "multipedidos" in resp_url.lower()
            )
            if products and (is_multi_url or sum(len(c.itens) for c in products) >= 3):
                hint = "multipedidos" if is_multi_url else "multipedidos-heuristic"
                hints.append(f"{hint}:{urlparse(resp_url).path[:80]}")
                multi_lists.append(products)
                if addons and len(addons) > len(addon_categories):
                    addon_categories = addons
        if multi_lists:
            categories = merge_category_lists(categories, *multi_lists)

        ranked = sorted(bag, key=lambda pair: -score_payload_as_menu(pair[1]))
        net_lists: list[list[MenuCategory]] = []
        for resp_url, data in ranked[:15]:
            if score_payload_as_menu(data) < 4:
                continue
            # evita misturar hoursTemplates etc. se já temos multipedidos
            if multi_lists and parse_multipedidos_payload(data):
                continue
            cats = extract_categories_from_payload(data)
            if cats:
                hints.append(f"network:{urlparse(resp_url).path[:80]}")
                net_lists.append(cats)
        if net_lists and not multi_lists:
            categories = merge_category_lists(categories, *net_lists)

        # DOM só se rede/json-ld/multipedidos não bastarem
        if not categories or _is_weak(categories):
            try:
                dom_cats = await _dom_heuristic(page, url)
                if dom_cats:
                    hints.append("dom-heuristic")
                    categories = merge_category_lists(categories, dom_cats)
            except Exception:
                pass
        else:
            hints.append("skip-dom-strong-network")

    finally:
        if browser:
            await browser.close()
        if p:
            await p.stop()

    if not categories or _is_weak(categories):
        raise RuntimeError(
            "Modo genérico não encontrou produtos suficientes nesta página. "
            "Funciona melhor com preços visíveis (R$). "
            "No Chrome: DevTools → Network → Fetch/XHR → copie o JSON e use "
            "a aba “Colar JSON bruto” com formato Genérico."
        )

    for cat in categories:
        for item in cat.itens:
            warnings.extend(item.avisos)

    if addon_categories:
        hints.append(f"adicionais={len(addon_categories)}")
    elif multi_lists:
        warnings.append(
            "Cardápio Multipedidos sem extras utilizáveis (grupos de adicionais vazios)."
        )

    if not any(i.imagem_url for c in categories for i in c.itens):
        warnings.append("Nenhuma imagem de produto encontrada.")

    host = urlparse(url).hostname or "site"
    hints.append(f"host={host}")

    return ExtractResult(
        platform="generic",
        source_url=url,
        store_name=store_name,
        categories=categories,
        addon_categories=addon_categories,
        warnings=warnings,
        raw_hints=hints,
    )
