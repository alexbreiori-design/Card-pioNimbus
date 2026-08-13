from __future__ import annotations

import traceback
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, HttpUrl

from adapters import detect_platform, extract_from_raw_payload, extract_menu
from image_zip import build_images_zip, collect_image_entries
from nimbus_export import build_nimbus_payload, summarize_payload

APP_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="Nimbus Menu Extractor",
    description="Extrai cardápios públicos (iFood / Anota AI / genérico) para JSON de import Nimbus.",
    version="0.3.0",
)

app.mount("/static", StaticFiles(directory=str(APP_DIR / "static")), name="static")

ModeLiteral = Literal["auto", "ifood", "anota_ai", "generic"]


class ExtractRequest(BaseModel):
    url: HttpUrl
    slug: str = Field(default="", description="Slug da loja Nimbus (opcional).")
    mode: ModeLiteral = Field(
        default="auto",
        description="auto detecta iFood/Anota; caso contrário usa genérico.",
    )


class RawExtractRequest(BaseModel):
    platform: Literal["ifood", "anota_ai", "generic"]
    payload: Any
    slug: str = ""
    source_url: str = ""
    merchant_id: str | None = None


class ImagesZipRequest(BaseModel):
    payload: dict[str, Any]
    slug: str = ""


class ExtractResponse(BaseModel):
    ok: bool
    platform: str | None = None
    store_name: str | None = None
    counts: dict[str, int] | None = None
    warnings: list[str] = Field(default_factory=list)
    hints: list[str] = Field(default_factory=list)
    payload: dict[str, Any] | None = None
    error: str | None = None
    imageCount: int | None = None


@app.get("/", response_class=HTMLResponse)
async def index() -> str:
    return (APP_DIR / "static" / "index.html").read_text(encoding="utf-8")


@app.post("/api/extract", response_model=ExtractResponse)
async def api_extract(body: ExtractRequest) -> ExtractResponse:
    url = str(body.url).strip()
    mode = None if body.mode == "auto" else body.mode
    platform = mode or detect_platform(url)

    try:
        result = await extract_menu(url, mode=mode)
        payload = build_nimbus_payload(result, slug=body.slug.strip())
        return ExtractResponse(
            ok=True,
            platform=result.platform,
            store_name=result.store_name or None,
            counts=summarize_payload(payload),
            warnings=result.warnings,
            hints=result.raw_hints,
            payload=payload,
            imageCount=len(collect_image_entries(payload)),
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
            imageCount=len(collect_image_entries(payload)),
        )
    except Exception as exc:
        traceback.print_exc()
        return ExtractResponse(
            ok=False,
            platform=body.platform,
            error=str(exc) or "Falha ao interpretar JSON bruto.",
        )


@app.post("/api/images-zip")
async def api_images_zip(body: ImagesZipRequest) -> Response:
    try:
        zip_bytes, meta = build_images_zip(body.payload)
    except Exception as exc:
        traceback.print_exc()
        return JSONResponse(
            {"ok": False, "error": str(exc) or "Falha ao gerar ZIP de imagens."},
            status_code=500,
        )

    if meta["downloaded"] == 0:
        return JSONResponse(
            {
                "ok": False,
                "error": "Nenhuma imagem pôde ser baixada.",
                "meta": meta,
            },
            status_code=400,
        )

    slug = (body.slug or "cardapio").strip() or "cardapio"
    safe_slug = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in slug)[:40]
    filename = f"nimbus-fotos-{safe_slug}.zip"
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "X-Images-Downloaded": str(meta["downloaded"]),
            "X-Images-Failed": str(meta["failed"]),
            "X-Images-Total": str(meta["total"]),
        },
    )


@app.get("/api/health")
async def health() -> JSONResponse:
    return JSONResponse({"ok": True, "service": "menu-extractor"})


def main() -> None:
    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=8765, reload=False)


if __name__ == "__main__":
    main()
