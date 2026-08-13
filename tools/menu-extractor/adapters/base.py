from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal
from urllib.parse import urlparse

DetectedPlatform = Literal["ifood", "anota_ai", "generic"]


@dataclass
class MenuItem:
    nome: str
    preco: float | None = None
    descricao: str = ""
    imagem_url: str = ""
    avisos: list[str] = field(default_factory=list)
    adicional_categorias: list[str] = field(default_factory=list)


@dataclass
class MenuCategory:
    nome: str
    itens: list[MenuItem] = field(default_factory=list)


@dataclass
class AddonCategory:
    nome: str
    itens: list[MenuItem] = field(default_factory=list)
    obrigatorio: bool = False
    min: int = 0
    max: int = 99
    tipo_selecao: str = "multipla"  # simples | multipla


@dataclass
class ExtractResult:
    platform: DetectedPlatform
    source_url: str
    store_name: str = ""
    categories: list[MenuCategory] = field(default_factory=list)
    addon_categories: list[AddonCategory] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    raw_hints: list[str] = field(default_factory=list)

    @property
    def product_count(self) -> int:
        return sum(len(cat.itens) for cat in self.categories)

    @property
    def category_count(self) -> int:
        return len(self.categories)

    @property
    def addon_category_count(self) -> int:
        return len(self.addon_categories)

    @property
    def addon_item_count(self) -> int:
        return sum(len(cat.itens) for cat in self.addon_categories)


def detect_platform(url: str) -> DetectedPlatform:
    host = (urlparse(url).hostname or "").lower()
    if "ifood.com.br" in host or host.endswith("ifood.com"):
        return "ifood"
    if "anota.ai" in host or "anotaai" in host:
        return "anota_ai"
    return "generic"


def normalize_price(value: Any) -> float | None:
    if value is None or value is False:
        return None
    if isinstance(value, (int, float)):
        num = float(value)
        # iFood às vezes manda centavos (ex.: 3290 = R$ 32,90)
        if isinstance(value, int) and num >= 1000 and num == int(num):
            # heurística: valores inteiros grandes sem casas → centavos
            if num >= 100 and num % 1 == 0 and num < 1_000_000:
                # Preferir reais se já parece preço (ex. 35); centavos se típico
                pass
        return max(0.0, num)
    text = str(value).strip()
    if not text:
        return None
    cleaned = (
        text.replace("R$", "")
        .replace("r$", "")
        .replace(" ", "")
        .replace("\u00a0", "")
    )
    # 1.234,56 → 1234.56
    if "," in cleaned and "." in cleaned:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    elif "," in cleaned:
        cleaned = cleaned.replace(",", ".")
    try:
        return max(0.0, float(cleaned))
    except ValueError:
        return None


def price_from_object(obj: dict[str, Any]) -> float | None:
    """Extrai preço de estruturas comuns (unitPrice, price.value, minPrice…)."""
    candidates: list[Any] = []

    for key in (
        "unitPrice",
        "unit_price",
        "priceValue",
        "price_value",
        "minPrice",
        "min_price",
        "lowestPrice",
        "basePrice",
        "base_price",
        "valor",
        "preco",
        "price",
    ):
        if key in obj and obj[key] is not None:
            candidates.append(obj[key])

    price_obj = obj.get("price")
    if isinstance(price_obj, dict):
        for key in ("value", "amount", "min", "originalValue", "unitPrice"):
            if key in price_obj and price_obj[key] is not None:
                candidates.append(price_obj[key])

    # variações / tamanhos → menor preço
    for var_key in ("prices", "variations", "sizes", "options", "choices"):
        variations = obj.get(var_key)
        if isinstance(variations, list):
            for var in variations:
                if isinstance(var, dict):
                    p = price_from_object(var)
                    if p is not None:
                        candidates.append(p)
                else:
                    candidates.append(var)

    parsed = [p for p in (normalize_price(c) for c in candidates) if p is not None]
    if not parsed:
        return None
    return min(parsed)


def image_from_object(obj: dict[str, Any]) -> str:
    for key in (
        "imageUrl",
        "image_url",
        "imagemUrl",
        "logoUrl",
        "picture",
        "photo",
        "image",
        "imagem",
        "urlImage",
        "thumbnail",
        "logo",
    ):
        val = obj.get(key)
        if isinstance(val, str) and val.startswith("http"):
            return val
        if isinstance(val, dict):
            for nested in ("url", "src", "path", "original", "large", "medium"):
                nested_val = val.get(nested)
                if isinstance(nested_val, str) and nested_val.startswith("http"):
                    return nested_val
    images = obj.get("images") or obj.get("fotos")
    if isinstance(images, list) and images:
        first = images[0]
        if isinstance(first, str) and first.startswith("http"):
            return first
        if isinstance(first, dict):
            return image_from_object(first)
    return ""


def item_from_object(obj: dict[str, Any]) -> MenuItem | None:
    nome = (
        obj.get("name")
        or obj.get("nome")
        or obj.get("title")
        or obj.get("descriptionTitle")
        or obj.get("productName")
        or ""
    )
    nome = str(nome).strip()
    if not nome or len(nome) < 2:
        return None

    descricao = str(
        obj.get("description")
        or obj.get("descricao")
        or obj.get("details")
        or obj.get("detail")
        or ""
    ).strip()

    preco = price_from_object(obj)
    avisos: list[str] = []
    if preco is None:
        avisos.append(f'Item "{nome}" sem preço detectado — usando 0.')
        preco = 0.0
    elif preco == 0:
        avisos.append(f'Item "{nome}" com preço 0.')

    # iFood às vezes envia preço em centavos (ex. 4590)
    if preco >= 1000 and preco == int(preco) and "unitPrice" in obj:
        # unitPrice no marketplace costuma ser em reais com decimais;
        # se for inteiro grande sem ponto, tratar como centavos
        raw = obj.get("unitPrice")
        if isinstance(raw, int) and raw >= 100:
            preco = raw / 100.0
            avisos.append(f'Preço de "{nome}" interpretado como centavos → R$ {preco:.2f}.')

    return MenuItem(
        nome=nome,
        preco=preco,
        descricao=descricao,
        imagem_url=image_from_object(obj),
        avisos=avisos,
    )


def category_name_from_object(obj: dict[str, Any]) -> str:
    return str(
        obj.get("name")
        or obj.get("nome")
        or obj.get("title")
        or obj.get("categoryName")
        or obj.get("category")
        or "Sem categoria"
    ).strip() or "Sem categoria"


ITEM_LIST_KEYS = (
    "itens",
    "items",
    "products",
    "produtos",
    "dishes",
    "menuItems",
    "menu_items",
    "cardapioItens",
)


CATEGORY_LIST_KEYS = (
    "categorias",
    "categories",
    "menu",
    "menus",
    "sections",
    "secoes",
    "groups",
    "grupos",
    "data",
)


def extract_categories_from_payload(payload: Any) -> list[MenuCategory]:
    """Tenta montar categorias a partir de JSON interceptado (estruturas variadas)."""
    found: list[MenuCategory] = []
    seen_item_keys: set[tuple[str, str]] = set()

    def add_category(nome: str, items_raw: list[Any]) -> None:
        itens: list[MenuItem] = []
        for raw in items_raw:
            if not isinstance(raw, dict):
                continue
            item = item_from_object(raw)
            if not item:
                continue
            key = (nome.lower(), item.nome.lower())
            if key in seen_item_keys:
                continue
            seen_item_keys.add(key)
            itens.append(item)
        if itens:
            # merge com categoria existente de mesmo nome
            for existing in found:
                if existing.nome.lower() == nome.lower():
                    for it in itens:
                        k = (existing.nome.lower(), it.nome.lower())
                        if k not in seen_item_keys:
                            existing.itens.append(it)
                        else:
                            # already tracked via seen; still allow merge if new
                            if not any(x.nome.lower() == it.nome.lower() for x in existing.itens):
                                existing.itens.append(it)
                    return
            found.append(MenuCategory(nome=nome, itens=itens))

    def walk(node: Any, depth: int = 0) -> None:
        if depth > 12 or node is None:
            return

        if isinstance(node, list):
            # lista de categorias?
            if node and all(isinstance(x, dict) for x in node):
                looks_like_categories = False
                for x in node[:8]:
                    for key in ITEM_LIST_KEYS:
                        if isinstance(x.get(key), list) and x.get(key):
                            looks_like_categories = True
                            break
                if looks_like_categories:
                    for x in node:
                        nome = category_name_from_object(x)
                        for key in ITEM_LIST_KEYS:
                            items = x.get(key)
                            if isinstance(items, list) and items:
                                add_category(nome, items)
                                break
                    return
                # lista de produtos flat
                if any(item_from_object(x) for x in node[:5] if isinstance(x, dict)):
                    add_category("Geral", node)
                    return
            for x in node:
                walk(x, depth + 1)
            return

        if isinstance(node, dict):
            # nó categoria explícito
            for key in ITEM_LIST_KEYS:
                items = node.get(key)
                if isinstance(items, list) and items and any(isinstance(i, dict) for i in items):
                    # só trata como categoria se tiver nome ou estiver claramente agrupado
                    nome = category_name_from_object(node)
                    if nome != "Sem categoria" or any(
                        k in node for k in ("id", "code", "categoryId", "sequence", "ordem")
                    ):
                        add_category(nome, items)

            for key in CATEGORY_LIST_KEYS:
                child = node.get(key)
                if child is not None:
                    walk(child, depth + 1)

            # continua descendo em outros dicts
            for key, child in node.items():
                if key in ITEM_LIST_KEYS or key in CATEGORY_LIST_KEYS:
                    continue
                if isinstance(child, (dict, list)):
                    walk(child, depth + 1)

    walk(payload)
    return found


def merge_category_lists(*lists: list[MenuCategory]) -> list[MenuCategory]:
    by_name: dict[str, MenuCategory] = {}
    order: list[str] = []
    for cats in lists:
        for cat in cats:
            key = cat.nome.strip().lower()
            if key not in by_name:
                by_name[key] = MenuCategory(nome=cat.nome, itens=[])
                order.append(key)
            existing = by_name[key]
            seen = {i.nome.lower() for i in existing.itens}
            for item in cat.itens:
                if item.nome.lower() not in seen:
                    existing.itens.append(item)
                    seen.add(item.nome.lower())
    return [by_name[k] for k in order if by_name[k].itens]


async def extract_menu(url: str, mode: DetectedPlatform | None = None) -> ExtractResult:
    platform = mode or detect_platform(url)
    if platform == "ifood":
        from .ifood import extract_ifood

        return await extract_ifood(url)
    if platform == "anota_ai":
        from .anota_ai import extract_anota_ai

        return await extract_anota_ai(url)
    from .generic import extract_generic

    return await extract_generic(url)


def extract_from_raw_payload(
    platform: DetectedPlatform,
    payload: Any,
    *,
    source_url: str = "",
    merchant_id: str | None = None,
) -> ExtractResult:
    """Converte JSON bruto (DevTools / interceptação) no modelo intermediário."""
    warnings: list[str] = []
    addon_categories: list = []
    if platform == "ifood":
        from .ifood_parser import parse_ifood_catalog_payload

        categories = parse_ifood_catalog_payload(payload, merchant_id)
    elif platform == "anota_ai":
        from .anota_parser import parse_anota_payload

        categories = parse_anota_payload(payload)
    else:
        from .generic import parse_json_ld_menu, parse_multipedidos_full

        products, addons = parse_multipedidos_full(payload)
        if products:
            categories = products
            addon_categories = addons
        else:
            ld_cats = parse_json_ld_menu(
                payload if isinstance(payload, list) else [payload],
                source_url,
            )
            heuristic_cats = extract_categories_from_payload(payload)

            def _priced_count(cats):
                return sum(1 for c in cats for i in c.itens if (i.preco or 0) > 0)

            if _priced_count(ld_cats) >= _priced_count(heuristic_cats) and ld_cats:
                categories = ld_cats
            else:
                categories = heuristic_cats or ld_cats

    if not categories:
        raise ValueError(
            "JSON bruto não contém categorias/produtos reconhecíveis para essa plataforma."
        )

    for cat in categories:
        for item in cat.itens:
            warnings.extend(item.avisos)

    return ExtractResult(
        platform=platform,
        source_url=source_url or f"raw://{platform}",
        store_name="",
        categories=categories,
        addon_categories=addon_categories,
        warnings=warnings,
        raw_hints=["raw-json"],
    )
