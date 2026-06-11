"""
Filezaar — Backend Entry Point
FastAPI + WebSocket server with real-time progress tracking.
Uses absolute paths so it works no matter where Python is launched from.
"""

import asyncio
import os
import re
import shutil
import uuid
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI, File, Form, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from contextlib import asynccontextmanager
from core.logger import get_logger
from core.router import ConversionRouter
from core.validator import FileValidator

logger = get_logger(__name__)

# ── Absolute paths anchored to this file's directory ─────────────────────────
BASE_DIR   = Path(__file__).resolve().parent
TMP_DIR    = BASE_DIR / "tmp"
UPLOAD_DIR = TMP_DIR / "uploads"
OUTPUT_DIR = TMP_DIR / "outputs"

for d in (UPLOAD_DIR, OUTPUT_DIR):
    d.mkdir(parents=True, exist_ok=True)

logger.info(f"UPLOAD_DIR : {UPLOAD_DIR}")
logger.info(f"OUTPUT_DIR : {OUTPUT_DIR}")

# ── Semaphore: max 4 concurrent conversions per replica ──────────────────────
CONVERSION_SEMAPHORE = asyncio.Semaphore(4)

# ── App ───────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: clean stale temp files
    removed = 0
    for folder in (UPLOAD_DIR, OUTPUT_DIR):
        for item in folder.iterdir():
            if item.name == ".gitkeep":
                continue
            try:
                if item.is_dir():
                    shutil.rmtree(item)
                else:
                    item.unlink()
                removed += 1
            except Exception as exc:
                logger.warning(f"Startup cleanup failed for {item}: {exc}")
    if removed:
        logger.info(f"Startup cleanup: removed {removed} stale item(s)")
    # Start background output cleanup task
    cleanup_task = asyncio.create_task(_periodic_output_cleanup())
    yield
    # Shutdown
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="Filezaar API",
    description="Convert any file format with real-time progress",
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# FastAPI does NOT support wildcard subdomains (*.vercel.app) — list them explicitly.
# Add any new Vercel preview URLs here, or use the custom middleware below.

EXACT_ORIGINS = [
    "https://filezaar.com",
    "https://www.filezaar.com",
    # ── Cloudflare Pages ──────────────────────────────────────────────────────
    # Replace these with your actual Cloudflare Pages project URLs:
    "https://filezaar.pages.dev",          # ← your Cloudflare Pages production URL
    "https://www.filezaar.pages.dev",
    # ── Local development ─────────────────────────────────────────────────────
    "http://localhost:5173",
    "http://localhost:3000",
]

# Regex patterns for origins we want to allow dynamically
# (covers all Cloudflare Pages preview deployments)
ORIGIN_PATTERNS = [
    re.compile(r"^https://[a-z0-9-]+\.filezaar\.pages\.dev$"),  # CF preview deploys
    re.compile(r"^https://filezaar.*\.pages\.dev$"),             # any filezaar CF pages
]


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    """
    Handles CORS for exact origins AND wildcard patterns.
    Replaces the built-in CORSMiddleware which can't do wildcard subdomains.
    """

    def _origin_allowed(self, origin: str) -> bool:
        if not origin:
            return False
        if origin in EXACT_ORIGINS:
            return True
        for pattern in ORIGIN_PATTERNS:
            if pattern.match(origin):
                return True
        return False

    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")
        allowed = self._origin_allowed(origin)

        # Handle preflight OPTIONS request
        if request.method == "OPTIONS":
            if allowed:
                return JSONResponse(
                    status_code=200,
                    headers={
                        "Access-Control-Allow-Origin": origin,
                        "Access-Control-Allow-Credentials": "true",
                        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                        "Access-Control-Allow-Headers": "*",
                        "Access-Control-Max-Age": "86400",
                    },
                )
            return JSONResponse(status_code=403, content={"error": "CORS not allowed"})

        response = await call_next(request)

        if allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "*"

        return response


# Register our custom CORS middleware (must be FIRST middleware added)
app.add_middleware(DynamicCORSMiddleware)

_router    = ConversionRouter()
_validator = FileValidator()

# job_id → WebSocket
active_ws: dict[str, WebSocket] = {}




# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"status": "Filezaar API running", "version": "2.0.0"}


@app.get("/api/formats")
async def get_formats():
    return JSONResponse(_router.get_supported_formats())


@app.post("/api/convert")
async def convert_file(
    request: Request,
    file: UploadFile = File(...),
    target_format: str = Form(...),
    job_id: Optional[str] = Form(None),
):
    job_id = job_id or str(uuid.uuid4())

    # Check Content-Length header BEFORE reading file into memory (prevents OOM on huge uploads)
    max_bytes = 2 * 1024 * 1024 * 1024  # 2 GB
    content_length = int(request.headers.get("content-length", 0))
    if content_length > max_bytes:
        human = f"{content_length / (1024**3):.1f} GB"
        return JSONResponse(status_code=413, content={"error": f"File too large ({human}). Maximum allowed is 2 GB.", "job_id": job_id})

    content = await file.read()
    file_size = len(content)

    v = _validator.validate(file.filename or "upload", file.content_type or "", file_size)
    if not v["valid"]:
        return JSONResponse(status_code=400, content={"error": v["reason"], "job_id": job_id})

    original_name = file.filename or "upload"
    suffix = Path(original_name).suffix
    if not suffix:
        suffix = f".{target_format}"

    orig_stem = Path(original_name).stem
    safe_stem = re.sub(r'[\\/:*?"<>|\x00-\x1f]', '_', orig_stem)[:80] or "file"
    input_path = UPLOAD_DIR / f"{job_id}_{safe_stem}{suffix}"

    try:
        input_path.write_bytes(content)
    except Exception as exc:
        logger.error(f"[{job_id}] Failed to write upload: {exc}")
        return JSONResponse(status_code=500, content={"error": f"Failed to save upload: {exc}"})

    logger.info(f"[{job_id}] Saved '{original_name}' ({file_size:,} B) → .{target_format}")

    asyncio.create_task(
        _run_conversion(job_id, input_path, target_format, original_name, safe_stem)
    )

    return JSONResponse({"job_id": job_id, "status": "queued", "filename": original_name})


async def _periodic_output_cleanup():
    """Delete output directories older than 1 hour every 10 minutes."""
    import time
    while True:
        try:
            await asyncio.sleep(600)  # every 10 minutes
            now = time.time()
            for job_dir in OUTPUT_DIR.iterdir():
                if job_dir.is_dir() and job_dir.name != ".gitkeep":
                    age = now - job_dir.stat().st_mtime
                    if age > 3600:  # 1 hour
                        shutil.rmtree(job_dir, ignore_errors=True)
                        logger.info(f"Auto-cleaned expired job dir: {job_dir.name}")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning(f"Cleanup task error: {e}")


async def _run_conversion(
    job_id: str,
    input_path: Path,
    target_format: str,
    original_name: str,
    safe_stem: str = "",
):
    async def _progress(pct: int, msg: str):
        ws = active_ws.get(job_id)
        if ws:
            try:
                await ws.send_json({"type": "progress", "job_id": job_id, "pct": pct, "message": msg})
            except Exception:
                pass

    out_dir = OUTPUT_DIR / job_id
    out_dir.mkdir(parents=True, exist_ok=True)

    await _progress(0, "Queued — waiting for a conversion slot...")
    async with CONVERSION_SEMAPHORE:
        await _progress(5, "Starting conversion...")
        try:
            result = await _router.convert(
                input_path=input_path,
                target_format=target_format,
                output_dir=out_dir,
                progress_cb=_progress,
                output_stem=safe_stem or None,
            )

            ws = active_ws.get(job_id)
            if ws:
                await ws.send_json({
                    "type": "complete",
                    "job_id": job_id,
                    "pct": 100,
                    "download_url": f"/api/download/{job_id}/{result['filename']}",
                    "filename": result["filename"],
                    "size": result["size"],
                })

        except Exception as exc:
            logger.error(f"[{job_id}] Conversion error: {exc}", exc_info=True)
            ws = active_ws.get(job_id)
            if ws:
                await ws.send_json({"type": "error", "job_id": job_id, "message": str(exc)})
        finally:
            try:
                input_path.unlink(missing_ok=True)
            except Exception:
                pass


@app.websocket("/ws/{job_id}")
async def ws_endpoint(websocket: WebSocket, job_id: str):
    await websocket.accept()
    active_ws[job_id] = websocket
    logger.info(f"[{job_id}] WS connected")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        active_ws.pop(job_id, None)


@app.get("/api/download/{job_id}/{filename}")
async def download(job_id: str, filename: str):
    safe_name = Path(filename).name
    file_path = OUTPUT_DIR / job_id / safe_name
    if not file_path.exists():
        logger.warning(f"Download not found: {file_path}")
        return JSONResponse(
            status_code=404,
            content={"error": "File not found. It may have been cleaned up."},
        )
    return FileResponse(
        path=file_path,
        filename=safe_name,
        media_type="application/octet-stream",
    )


@app.delete("/api/jobs/{job_id}")
async def cleanup(job_id: str):
    job_dir = OUTPUT_DIR / job_id
    if job_dir.exists():
        shutil.rmtree(job_dir, ignore_errors=True)
    return {"status": "cleaned", "job_id": job_id}


@app.get("/api/health")
async def health():
    import importlib
    tools = {}
    for t in ["ffmpeg", "ffprobe", "pandoc", "unrar", "rar"]:
        tools[t] = bool(shutil.which(t))

    pkgs = [
        "PIL", "pillow_heif", "cairosvg", "pypdf", "pypdfium2",
        "docx", "mammoth", "markdown", "reportlab", "weasyprint",
        "pdfminer", "openpyxl", "pptx", "py7zr", "rarfile",
    ]
    for p in pkgs:
        try:
            importlib.import_module(p)
            tools[f"pip:{p}"] = True
        except ImportError:
            tools[f"pip:{p}"] = False

    return {
        "status": "ok",
        "upload_dir": str(UPLOAD_DIR),
        "output_dir": str(OUTPUT_DIR),
        "active_connections": len(active_ws),
        "tools": tools,
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info",
        workers=1,
    )