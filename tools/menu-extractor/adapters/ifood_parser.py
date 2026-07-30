from __future__ import annotations

from typing import Any

from .base import MenuCategory, MenuItem, image_from_object, normalize_price


PRODUCT_CDN = "https://static-images.ifood.com.br/image/upload"


def build_ifood_product_image(path: str | None, merchant_id: str | None = None) -> str:
    if not path:
        return ""
    path = str(path).lstrip("/").replace("\\", "/")
    if path.startswith("http"):
        return path
    if merchant_id and not path.startswith(f"{merchant_id}/") and not path.startswith("pratos/"):
        path = f"{merchant_id}/{path}"
    if not path.startswith("pratos/"):
        path = f"pratos/{path}"
    return f"{PRODUCT_CDN}/t_high/{path}"


def _item_name(obj: dict[str, Any]) -> str:
    # site-api usa `description` como nome do prato
    return str(
        obj.get("name")
        or obj.get("nome")
        or obj.get("description")
        or obj.get("title")
        or ""
    ).strip()


def _item_description(obj: dict[str, Any]) -> str:
    return str(
        obj.get("details")
        or obj.get("itemDescription")
        or obj.get("longDescription")
        or obj.get("descricao")
        or ""
    ).strip()


def _item_price(obj: dict[str, Any]) -> float | None:
    for key in (
        "unitMinPrice",
        "unitPrice",
        "minimumPrice",
        "minPrice",
        "price",
        "preco",
        "valor",
    ):
        if key in obj and obj[key] is not None:
            if key == "price" and isinstance(obj[key], dict):
                for nested in ("value", "amount", "min", "unitPrice"):
                    if obj[key].get(nested) is not None:
                        return normalize_price(obj[key][nested])
            return normalize_price(obj[key])
    return None


def parse_ifood_item(obj: dict[str, Any], merchant_id: str | None = None) -> MenuItem | None:
    nome = _item_name(obj)
    if len(nome) < 2:
        return None
    preco = _item_price(obj)
    avisos: list[str] = []
    if preco is None:
        avisos.append(f'Item "{nome}" sem preço detectado — usando 0.')
        preco = 0.0

    image = (
        build_ifood_product_image(
            obj.get("imagePath") or obj.get("logoUrl") or obj.get("image"),
            merchant_id,
        )
        or image_from_object(obj)
    )

    return MenuItem(
        nome=nome,
        preco=preco,
        descricao=_item_description(obj),
        imagem_url=image,
        avisos=avisos,
    )


def parse_ifood_category(
    cat: dict[str, Any],
    merchant_id: str | None = None,
) -> MenuCategory | None:
    nome = str(
        cat.get("friendlyName")
        or cat.get("name")
        or cat.get("nome")
        or cat.get("description")
        or ""
    ).strip()
    if not nome:
        return None
    raw_items = cat.get("itens") or cat.get("items") or []
    itens: list[MenuItem] = []
    seen: set[str] = set()
    for raw in raw_items:
        if not isinstance(raw, dict):
            continue
        item = parse_ifood_item(raw, merchant_id)
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


def parse_ifood_catalog_payload(
    raw: Any,
    merchant_id: str | None = None,
) -> list[MenuCategory]:
    """Aceita payloads site-api / marketplace v2/v3 do iFood."""
    if not isinstance(raw, dict):
        return []

    data = raw.get("data") if isinstance(raw.get("data"), dict) else {}
    menu = data.get("menu") or raw.get("menu")
    if isinstance(menu, list) and menu:
        cats = [parse_ifood_category(c, merchant_id) for c in menu if isinstance(c, dict)]
        return [c for c in cats if c]

    # marketplace v3
    context = raw.get("contextSetup") if isinstance(raw.get("contextSetup"), dict) else {}
    catalogs = context.get("catalogs") or raw.get("catalogs") or raw.get("catalog") or []
    all_cats: list[Any] = []
    if isinstance(catalogs, list):
        for entry in catalogs:
            if isinstance(entry, dict):
                all_cats.extend(entry.get("catalog") or entry.get("categories") or [])
            elif isinstance(entry, list):
                all_cats.extend(entry)
    if not all_cats:
        all_cats = raw.get("categories") or []

    cats = [parse_ifood_category(c, merchant_id) for c in all_cats if isinstance(c, dict)]
    return [c for c in cats if c]


def looks_like_ifood_catalog(url: str, payload: Any) -> bool:
    if "/catalog" in url.lower() or "site-api" in url.lower():
        return True
    if not isinstance(payload, dict):
        return False
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    menu = data.get("menu") or payload.get("menu")
    return isinstance(menu, list) and bool(menu)
