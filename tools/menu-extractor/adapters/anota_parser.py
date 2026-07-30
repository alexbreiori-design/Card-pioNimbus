from __future__ import annotations

from typing import Any

from .base import MenuCategory, MenuItem, image_from_object, normalize_price


def _item_name(obj: dict[str, Any]) -> str:
    return str(
        obj.get("nome")
        or obj.get("name")
        or obj.get("title")
        or obj.get("productName")
        or ""
    ).strip()


def _item_description(obj: dict[str, Any]) -> str:
    return str(
        obj.get("descricao")
        or obj.get("description")
        or obj.get("details")
        or obj.get("detail")
        or ""
    ).strip()


def _item_price(obj: dict[str, Any]) -> float | None:
    for key in ("preco", "price", "valor", "unitPrice", "value", "amount"):
        val = obj.get(key)
        if val is None:
            continue
        if isinstance(val, dict):
            for nested in ("value", "amount", "min", "preco", "price"):
                if val.get(nested) is not None:
                    return normalize_price(val.get(nested))
        else:
            return normalize_price(val)
    # preços por tamanho → menor
    for key in ("prices", "sizes", "tamanhos", "variations"):
        arr = obj.get(key)
        if isinstance(arr, list) and arr:
            parsed = []
            for entry in arr:
                if isinstance(entry, dict):
                    p = _item_price(entry)
                else:
                    p = normalize_price(entry)
                if p is not None:
                    parsed.append(p)
            if parsed:
                return min(parsed)
    return None


def parse_anota_item(obj: dict[str, Any]) -> MenuItem | None:
    nome = _item_name(obj)
    if len(nome) < 2:
        return None
    preco = _item_price(obj)
    avisos: list[str] = []
    if preco is None:
        avisos.append(f'Item "{nome}" sem preço detectado — usando 0.')
        preco = 0.0
    image = image_from_object(obj)
    for key in ("imagem", "image", "foto", "photoUrl", "url_image", "image_url"):
        val = obj.get(key)
        if isinstance(val, str) and val.startswith("http"):
            image = val
            break
    return MenuItem(
        nome=nome,
        preco=preco,
        descricao=_item_description(obj),
        imagem_url=image,
        avisos=avisos,
    )


def parse_anota_category(obj: dict[str, Any]) -> MenuCategory | None:
    nome = str(
        obj.get("nome")
        or obj.get("name")
        or obj.get("title")
        or obj.get("categoryName")
        or ""
    ).strip()
    if not nome:
        return None
    raw_items = (
        obj.get("itens")
        or obj.get("items")
        or obj.get("produtos")
        or obj.get("products")
        or obj.get("cardapio")
        or []
    )
    itens: list[MenuItem] = []
    seen: set[str] = set()
    for raw in raw_items:
        if not isinstance(raw, dict):
            continue
        item = parse_anota_item(raw)
        if not item:
            continue
        key = item.nome.lower()
        if key in seen:
            continue
        seen.add(key)
        itens.append(item)
    if not itens:
        return None
    return MenuCategory(nome=nome, itens=itens)


def parse_anota_payload(raw: Any) -> list[MenuCategory]:
    if isinstance(raw, list):
        cats = [parse_anota_category(x) for x in raw if isinstance(x, dict)]
        parsed = [c for c in cats if c]
        if parsed:
            return parsed
        # lista flat de produtos
        itens = [parse_anota_item(x) for x in raw if isinstance(x, dict)]
        itens = [i for i in itens if i]
        return [MenuCategory(nome="Geral", itens=itens)] if itens else []

    if not isinstance(raw, dict):
        return []

    for key in (
        "categorias",
        "categories",
        "menu",
        "menus",
        "cardapio",
        "sections",
    ):
        val = raw.get(key)
        if isinstance(val, list) and val:
            cats = parse_anota_payload(val)
            if cats:
                return cats

    data = raw.get("data")
    if data is not None:
        cats = parse_anota_payload(data)
        if cats:
            return cats

    # objeto único categoria
    cat = parse_anota_category(raw)
    return [cat] if cat else []
