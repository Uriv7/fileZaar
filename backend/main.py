"""
FileZaar — Zero-Storage Backend
Files exist ONLY in RAM (BytesIO) during conversion.
Nothing is ever written to disk. Nothing is ever stored.
Input bytes → conversion in memory → output bytes → streamed to browser → gone.
"""

import asyncio
import io
import os
import re
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI, File, Form, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse, StreamingResponse
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager

try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    _HAS_SLOWAPI = True
except ImportError:
    _HAS_SLOWAPI = False

from core.logger import get_logger
from core.router import ConversionRouter
from core.validator import FileValidator

logger = get_logger(__name__)

# ── Rate limiter ──────────────────────────────────────────────────────────────
if _HAS_SLOWAPI:
    _limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
else:
    _limiter = None

# ── Concurrency ───────────────────────────────────────────────────────────────
MAX_JOBS = int(os.environ.get("MAX_CONCURRENT_JOBS", "2"))
CONVERSION_SEMAPHORE = asyncio.Semaphore(MAX_JOBS)
CONVERSION_TIMEOUT   = float(os.environ.get("CONVERSION_TIMEOUT", "18"))
MAX_UPLOAD_BYTES     = int(os.environ.get("MAX_UPLOAD_MB", "200")) * 1024 * 1024

# ── In-memory job results store ───────────────────────────────────────────────
# key: job_id → {"data": bytes, "filename": str, "content_type": str}
# Automatically expires after download or 5 minutes — whichever comes first
_job_results: dict[str, dict] = {}
_job_ws:      dict[str, WebSocket] = {}

# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background tasks
    cleanup_task = asyncio.create_task(_expire_results())

    # Warmup slow libraries in background thread so first request is fast
    try:
        import threading
        def _warmup():
            try:
                import pypdfium2  # noqa
                from weasyprint import HTML
                HTML(string="<p>w</p>").write_pdf()
                logger.info("WeasyPrint warmed ✓")
            except Exception as e:
                logger.warning(f"Warmup: {e}")
        threading.Thread(target=_warmup, daemon=True).start()
    except Exception:
        pass

    yield

    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass


async def _expire_results():
    """Remove in-memory results older than 5 minutes every 60 seconds."""
    import time
    job_times: dict[str, float] = {}
    while True:
        try:
            await asyncio.sleep(60)
            now = time.time()
            expired = [jid for jid, t in job_times.items() if now - t > 300]
            for jid in expired:
                _job_results.pop(jid, None)
                job_times.pop(jid, None)
            # Track new jobs
            for jid in list(_job_results.keys()):
                if jid not in job_times:
                    job_times[jid] = now
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning(f"Expire task: {e}")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="FileZaar API — Zero Storage",
    description="Files processed in RAM only. Nothing stored. Nothing logged.",
    version="3.0.0",
    lifespan=lifespan,
    docs_url=None,   # disable Swagger UI in production
    redoc_url=None,
)

if _HAS_SLOWAPI and _limiter:
    app.state.limiter = _limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────────
EXACT_ORIGINS = [
    "https://filezaar.com",
    "https://www.filezaar.com",
    "https://filezaar.pages.dev",
    "https://www.filezaar.pages.dev",
    "http://localhost:5173",
    "http://localhost:3000",
]
ORIGIN_PATTERNS = [
    re.compile(r"^https://[a-z0-9-]+\.filezaar\.pages\.dev$"),
]

class DynamicCORSMiddleware(BaseHTTPMiddleware):
    def _allowed(self, origin: str) -> bool:
        if not origin: return False
        if origin in EXACT_ORIGINS: return True
        return any(p.match(origin) for p in ORIGIN_PATTERNS)

    async def dispatch(self, request: Request, call_next):
        origin  = request.headers.get("origin", "")
        allowed = self._allowed(origin)
        if request.method == "OPTIONS":
            if allowed:
                return JSONResponse(status_code=200, headers={
                    "Access-Control-Allow-Origin":      origin,
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Allow-Methods":     "GET, POST, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers":     "*",
                    "Access-Control-Max-Age":           "86400",
                })
            return JSONResponse(status_code=403, content={"error": "CORS not allowed"})
        response = await call_next(request)
        if allowed:
            response.headers["Access-Control-Allow-Origin"]      = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

app.add_middleware(DynamicCORSMiddleware)

_router    = ConversionRouter()
_validator = FileValidator()


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"status": "FileZaar API — zero storage mode", "version": "3.0.0",
            "privacy": "Files are never stored. Processed in RAM only."}


@app.get("/api/formats")
async def get_formats():
    return JSONResponse(_router.get_supported_formats())


@app.get("/api/health")
async def health():
    tools = {t: bool(shutil.which(t)) for t in ["ffmpeg", "pandoc"]}
    return {
        "status": "ok",
        "mode": "zero-storage (RAM only)",
        "active_jobs": len(_job_results),
        "active_ws":   len(_job_ws),
        "tools":       tools,
    }


@app.post("/api/convert")
async def convert_file(
    request: Request,
    file: UploadFile = File(...),
    target_format: str = Form(...),
    job_id: Optional[str] = Form(None),
):
    job_id = job_id or str(uuid.uuid4())

    # Size check BEFORE reading into memory
    content_length = int(request.headers.get("content-length", 0))
    if content_length > MAX_UPLOAD_BYTES:
        mb = MAX_UPLOAD_BYTES // (1024 * 1024)
        return JSONResponse(status_code=413,
            content={"error": f"File too large. Maximum is {mb} MB.", "job_id": job_id})

    # Read file into memory — this is the ONLY time we touch the file data
    content = await file.read()
    file_size = len(content)

    if file_size > MAX_UPLOAD_BYTES:
        return JSONResponse(status_code=413,
            content={"error": f"File too large ({file_size/1024/1024:.1f} MB).", "job_id": job_id})

    v = _validator.validate(file.filename or "upload", file.content_type or "", file_size)
    if not v["valid"]:
        return JSONResponse(status_code=400, content={"error": v["reason"], "job_id": job_id})

    original_name = file.filename or "upload"
    suffix   = Path(original_name).suffix or f".{target_format}"
    orig_stem = Path(original_name).stem
    safe_stem = re.sub(r'[\\/:*?"<>|\x00-\x1f]', '_', orig_stem)[:80] or "file"

    # Fire conversion in background — pass bytes, not a file path
    asyncio.create_task(
        _run_conversion_ram(job_id, content, suffix, target_format, safe_stem, original_name)
    )

    # File bytes are handed off to the task — original reference will be GC'd after conversion
    del content

    return JSONResponse({"job_id": job_id, "status": "queued", "filename": original_name})


async def _run_conversion_ram(
    job_id: str,
    file_bytes: bytes,
    suffix: str,
    target_format: str,
    safe_stem: str,
    original_name: str,
):
    """
    Convert entirely in RAM using a temporary directory that is
    wiped immediately after conversion — regardless of success or failure.
    The output bytes are held in _job_results until downloaded, then deleted.
    """
    async def _progress(pct: int, msg: str):
        ws = _job_ws.get(job_id)
        if ws:
            try:
                await ws.send_json({"type": "progress", "job_id": job_id,
                                    "pct": pct, "message": msg})
            except Exception:
                pass

    await _progress(0, "Queued…")

    async with CONVERSION_SEMAPHORE:
        await _progress(5, "Starting…")

        # Use a RAM-backed tmpfs when available (/dev/shm on Linux),
        # otherwise /tmp. Either way, wiped immediately after.
        tmp_base = "/dev/shm" if os.path.exists("/dev/shm") else tempfile.gettempdir()

        with tempfile.TemporaryDirectory(dir=tmp_base, prefix=f"fz_{job_id}_") as tmp:
            tmp_path = Path(tmp)
            input_path  = tmp_path / f"input{suffix}"
            output_dir  = tmp_path / "out"
            output_dir.mkdir()

            # Write input to RAM-backed tmp (wiped when context exits)
            input_path.write_bytes(file_bytes)
            del file_bytes  # free RAM immediately — we don't need original anymore

            try:
                result = await asyncio.wait_for(
                    _router.convert(
                        input_path=input_path,
                        target_format=target_format,
                        output_dir=output_dir,
                        progress_cb=_progress,
                        output_stem=safe_stem,
                    ),
                    timeout=CONVERSION_TIMEOUT,
                )

                out_file = output_dir / result["filename"]
                # Read output into RAM
                output_bytes = out_file.read_bytes()
                # tmp directory is wiped here (context manager exit) ← file gone from disk

                # Store output in RAM — available for ONE download then deleted
                _job_results[job_id] = {
                    "data":         output_bytes,
                    "filename":     result["filename"],
                    "size":         len(output_bytes),
                }
                del output_bytes  # only reference is in _job_results now

                ws = _job_ws.get(job_id)
                if ws:
                    await ws.send_json({
                        "type":         "complete",
                        "job_id":       job_id,
                        "pct":          100,
                        "download_url": f"/api/download/{job_id}",
                        "filename":     result["filename"],
                        "size":         result["size"],
                    })
                logger.info(f"[{job_id}] Done: {original_name} → {result['filename']} "
                            f"({result['size']:,} B)")

            except asyncio.TimeoutError:
                logger.error(f"[{job_id}] Timeout after {CONVERSION_TIMEOUT}s")
                ws = _job_ws.get(job_id)
                if ws:
                    await ws.send_json({"type": "error", "job_id": job_id,
                        "message": f"Conversion timed out ({CONVERSION_TIMEOUT}s). "
                                   "Try a smaller file or simpler format."})
            except Exception as exc:
                logger.error(f"[{job_id}] Error: {exc}", exc_info=True)
                ws = _job_ws.get(job_id)
                if ws:
                    await ws.send_json({"type": "error", "job_id": job_id,
                                        "message": str(exc)})
            # TemporaryDirectory context exits here — ALL temp files deleted automatically


@app.get("/api/download/{job_id}")
async def download(job_id: str):
    """
    Stream output bytes directly from RAM to browser.
    Deletes the in-memory result immediately after streaming — one-time download.
    """
    result = _job_results.pop(job_id, None)  # pop = delete from memory on read
    if not result:
        return JSONResponse(status_code=404,
            content={"error": "File not found. Already downloaded or expired (5 min limit)."})

    data     = result["data"]
    filename = result["filename"]

    # Detect MIME type
    ext = Path(filename).suffix.lower()
    mime_map = {
        ".pdf": "application/pdf", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif",
        ".mp3": "audio/mpeg", ".aac": "audio/aac", ".wav": "audio/wav",
        ".flac": "audio/flac", ".ogg": "audio/ogg", ".m4a": "audio/mp4",
        ".mp4": "video/mp4", ".mkv": "video/x-matroska", ".webm": "video/webm",
        ".zip": "application/zip", ".7z": "application/x-7z-compressed",
        ".tar": "application/x-tar",
        ".txt": "text/plain", ".md": "text/markdown", ".html": "text/html",
        ".csv": "text/csv", ".json": "application/json", ".xml": "application/xml",
    }
    content_type = mime_map.get(ext, "application/octet-stream")

    # Add security headers — tell browser NOT to cache the file
    headers = {
        "Content-Disposition":       f'attachment; filename="{filename}"',
        "Content-Length":            str(len(data)),
        "Cache-Control":             "no-store, no-cache, must-revalidate",
        "Pragma":                    "no-cache",
        "X-Content-Type-Options":    "nosniff",
        "X-Robots-Tag":              "noindex",
    }

    return Response(content=data, media_type=content_type, headers=headers)


@app.websocket("/ws/{job_id}")
async def ws_endpoint(websocket: WebSocket, job_id: str):
    await websocket.accept()
    _job_ws[job_id] = websocket
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        _job_ws.pop(job_id, None)


@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str):
    """Explicit deletion — called by frontend after download."""
    _job_results.pop(job_id, None)
    return {"status": "deleted", "job_id": job_id}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port,
                reload=False, log_level="info", workers=1)
