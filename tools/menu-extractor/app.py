from __future__ import annotations

import traceback
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, HttpUrl

from adapters import detect_platform, extract_from_raw_payload, extract_menu
from nimbus_export import build_nimbus_payload, summarize_payload

APP_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="Nimbus Menu Extractor",
    description="Extrai cardápios públicos (iFood / Anota AI) para JSON de import Nimbus.",
    version="0.1.0",
)

app.mount("/static", StaticFiles(directory=str(APP_DIR / "static")), name="static")


class ExtractRequest(BaseModel):
    url: HttpUrl
    slug: str = Field(default="", description="Slug da loja Nimbus (opcional, vai no JSON).")


class RawExtractRequest(BaseModel):
    platform: Literal["ifood", "anota_ai"]
    payload: Any
    slug: str = ""
    source_url: str = ""
    merchant_id: str | None = None


class ExtractResponse(BaseModel):
    ok: bool
    platform: str | None = None
    store_name: str | None = None
    counts: dict[str, int] | None = None
    warnings: list[str] = Field(default_factory=list)
    hints: list[str] = Field(default_factory=list)
    payload: dict[str, Any] | None = None
    error: str | None = None


@app.get("/", response_class=HTMLResponse)
async def index() -> str:
    html_path = APP_DIR / "static" / "index.html"
    return html_path.read_text(encoding="utf-8")


@app.post("/api/extract", response_model=ExtractResponse)
async def api_extract(body: ExtractRequest) -> ExtractResponse:
    url = str(body.url).strip()
    try:
        platform = detect_platform(url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        result = await extract_menu(url)
        payload = build_nimbus_payload(result, slug=body.slug.strip())
        return ExtractResponse(
            ok=True,
            platform=result.platform,
            store_name=result.store_name or None,
            counts=summarize_payload(payload),
            warnings=result.warnings,
            hints=result.raw_hints,
            payload=payload,
        )
    except Exception as exc:
        traceback.print_exc()
        return ExtractResponse(
            ok=False,
            platform=platform,
            error=str(exc) or "Falha na extração.",
            warnings=[],
        )


@app.post("/api/extract-raw", response_model=ExtractResponse)
async def api_extract_raw(body: RawExtractRequest) -> ExtractResponse:
    try:
        result = extract_from_raw_payload(
            body.platform,
            body.payload,
            source_url=body.source_url.strip(),
            merchant_id=body.merchant_id,
        )
        payload = build_nimbus_payload(result, slug=body.slug.strip())
        return ExtractResponse(
            ok=True,
            platform=result.platform,
            store_name=result.store_name or None,
            counts=summarize_payload(payload),
            warnings=result.warnings,
            hints=result.raw_hints,
            payload=payload,
        )
    except Exception as exc:
        traceback.print_exc()
        return ExtractResponse(
            ok=False,
            platform=body.platform,
            error=str(exc) or "Falha ao interpretar JSON bruto.",
        )


@app.get("/api/health")
async def health() -> JSONResponse:
    return JSONResponse({"ok": True, "service": "menu-extractor"})


def main() -> None:
    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=8765, reload=False)


if __name__ == "__main__":
    main()
