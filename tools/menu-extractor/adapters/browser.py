from __future__ import annotations

import re
from typing import Any

from playwright.async_api import Page, async_playwright


STEALTH_INIT = """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
window.chrome = window.chrome || { runtime: {} };
Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
"""


def is_bot_block_html(html: str, title: str = "") -> str | None:
    text = f"{title}\n{html}".lower()
    if "attention required" in text and "cloudflare" in text:
        return "cloudflare"
    if "cf-browser-verification" in text or "cf-challenge" in text:
        return "cloudflare"
    if "px-captcha" in text or "access to this page has been denied" in text:
        return "perimeterx"
    if "sorry, you have been blocked" in text:
        return "cloudflare"
    return None


async def open_browser_page(url: str | None = None):
    """Context manager-like helper: returns (playwright, browser, context, page)."""
    p = await async_playwright().start()
    browser = await p.chromium.launch(
        headless=True,
        args=[
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage",
        ],
    )
    context = await browser.new_context(
        locale="pt-BR",
        timezone_id="America/Sao_Paulo",
        user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        ),
        viewport={"width": 1366, "height": 900},
        extra_http_headers={
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        },
    )
    await context.add_init_script(STEALTH_INIT)
    page = await context.new_page()
    if url:
        await page.goto(url, wait_until="domcontentloaded", timeout=90_000)
    return p, browser, context, page


async def dismiss_common_modals(page: Page) -> None:
    for label in (
        "Aceitar",
        "Aceitar todos",
        "Concordo",
        "Entendi",
        "OK",
        "Continuar",
        "Agora não",
        "Fechar",
    ):
        try:
            btn = page.get_by_role("button", name=re.compile(rf"^{label}$", re.I))
            if await btn.count():
                await btn.first.click(timeout=1200)
                await page.wait_for_timeout(200)
        except Exception:
            continue


async def scroll_page(page: Page, rounds: int = 12) -> None:
    for _ in range(rounds):
        await page.evaluate(
            "window.scrollBy(0, Math.max(700, Math.floor(window.innerHeight * 0.9)))"
        )
        await page.wait_for_timeout(280)
    await page.evaluate("window.scrollTo(0, 0)")
    await page.wait_for_timeout(250)


async def assert_page_not_blocked(page: Page) -> None:
    title = await page.title()
    html = await page.content()
    kind = is_bot_block_html(html, title)
    if kind == "cloudflare":
        raise RuntimeError(
            "Cloudflare bloqueou o acesso a partir deste ambiente. "
            "Rode a ferramenta na sua máquina local (fora de datacenter) e tente de novo."
        )
    if kind == "perimeterx":
        raise RuntimeError(
            "O anti-bot do iFood (PerimeterX) bloqueou esta sessão. "
            "Rode localmente no seu computador; se persistir, abra a URL no Chrome "
            "normal, copie a resposta JSON de /catalog no DevTools e use a aba "
            "“Colar JSON bruto”."
        )


def collect_json_listener(bag: list[tuple[str, Any]]):
    async def on_response(response) -> None:
        try:
            if response.status >= 400:
                return
            ct = (response.headers.get("content-type") or "").lower()
            url = response.url
            interesting = any(
                h in url.lower()
                for h in (
                    "catalog",
                    "menu",
                    "merchant",
                    "cardapio",
                    "categoria",
                    "product",
                    "produto",
                    "item",
                    "anota",
                    "site-api",
                )
            )
            if "json" not in ct and not interesting:
                return
            body = await response.body()
            if not body or len(body) > 12_000_000:
                return
            text = body.decode("utf-8", errors="ignore").strip()
            if not text or text[0] not in "{[":
                return
            import json

            bag.append((url, json.loads(text)))
        except Exception:
            return

    return on_response
