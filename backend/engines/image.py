"""
engines/image.py
Handles: JPG, PNG, WEBP, GIF, BMP, TIFF, AVIF, ICO, SVG, HEIC/HEIF
"""
import asyncio, io
from pathlib import Path
from typing import Callable, Awaitable
from core.logger import get_logger
logger = get_logger(__name__)

PIL_FMT = {
    "jpg":"JPEG","jpeg":"JPEG","png":"PNG","webp":"WEBP",
    "gif":"GIF","bmp":"BMP","tiff":"TIFF","tif":"TIFF",
    "ico":"ICO","avif":"AVIF",
}
SAVE_OPTS = {
    "JPEG":{"quality":92,"optimize":True},
    "PNG":{"optimize":True},
    "WEBP":{"quality":88,"method":6},
    "AVIF":{"quality":70},
    "TIFF":{"compression":"tiff_lzw"},
    "GIF":{},"BMP":{},"ICO":{},
}

def _reg_heic():
    try:
        from pillow_heif import register_heif_opener
        register_heif_opener(); return True
    except ImportError:
        return False

class ImageEngine:
    def __init__(self):
        self._heic = _reg_heic()

    async def convert(self, input_path, target_format, output_dir, progress_cb, output_stem=None):
        await progress_cb(10, "Loading image…")
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._sync, input_path, target_format, output_dir, output_stem)

    def _sync(self, inp: Path, tgt_raw: str, out_dir: Path, output_stem=None) -> dict:
        try:
            from PIL import Image
        except ImportError:
            raise RuntimeError("Pillow not installed — run: pip install Pillow")

        tgt = tgt_raw.lower().lstrip(".")
        ext = inp.suffix.lstrip(".").lower()

        if ext == "svg":
            return self._svg(inp, tgt, out_dir, output_stem)
        if ext in ("heic","heif") and not self._heic:
            raise RuntimeError(
                "HEIC needs pillow-heif:\n  pip install pillow-heif\n"
                "  macOS: brew install libheif\n  Ubuntu: apt install libheif1"
            )

        pil_fmt = PIL_FMT.get(tgt, tgt.upper())
        stem = output_stem or inp.stem
        out_name = f"{stem}.{tgt}"
        out_path = out_dir / out_name
        # Ensure output dir exists
        out_dir.mkdir(parents=True, exist_ok=True)

        with Image.open(inp) as img:
            img = _fix_mode(img, pil_fmt)
            if pil_fmt == "ICO":
                sizes = [(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)]
                valid = [(w,h) for w,h in sizes if w <= img.width and h <= img.height]
                img.save(out_path, format="ICO", sizes=valid or [(img.width,img.height)])
            else:
                img.save(out_path, format=pil_fmt, **SAVE_OPTS.get(pil_fmt,{}))

        size = out_path.stat().st_size
        logger.info(f"Image OK: {inp.name} → {out_name} ({size:,} B)")
        return {"filename": out_name, "size": size}

    def _svg(self, inp: Path, tgt: str, out_dir: Path, output_stem=None) -> dict:
        try:
            import cairosvg
        except ImportError:
            raise RuntimeError(
                "SVG conversion needs cairosvg:\n  pip install cairosvg\n"
                "  macOS: brew install cairo pango gdk-pixbuf\n"
                "  Ubuntu: apt install libcairo2-dev libpango1.0-dev"
            )
        out_dir.mkdir(parents=True, exist_ok=True)
        stem = output_stem or inp.stem
        out_name = f"{stem}.{tgt}"
        out_path = out_dir / out_name
        url = str(inp.resolve())
        if tgt == "png":
            cairosvg.svg2png(url=url, write_to=str(out_path))
        elif tgt == "pdf":
            cairosvg.svg2pdf(url=url, write_to=str(out_path))
        elif tgt in ("jpg","jpeg"):
            from PIL import Image
            data = cairosvg.svg2png(url=url)
            img = Image.open(io.BytesIO(data)).convert("RGB")
            img.save(out_path, "JPEG", quality=92, optimize=True)
        elif tgt in ("webp","bmp","gif","tiff","tif","avif"):
            from PIL import Image
            data = cairosvg.svg2png(url=url)
            img = Image.open(io.BytesIO(data))
            pil_fmt = PIL_FMT.get(tgt, tgt.upper())
            img = _fix_mode(img, pil_fmt)
            img.save(out_path, format=pil_fmt, **SAVE_OPTS.get(pil_fmt, {}))
        elif tgt in ("ico",):
            from PIL import Image
            data = cairosvg.svg2png(url=url)
            img = Image.open(io.BytesIO(data)).convert("RGBA")
            sizes = [(s,s) for s in (16,32,48,64,128,256)]
            img.save(out_path, format="ICO", sizes=sizes)
        else:
            raise ValueError(f"SVG → .{tgt} not supported. Try: png, jpg, pdf, webp, gif, bmp, tiff, ico")
        return {"filename": out_name, "size": out_path.stat().st_size}

def _fix_mode(img, pil_fmt):
    from PIL import Image
    if pil_fmt == "JPEG":
        if img.mode in ("RGBA","LA","PA","P"):
            bg = Image.new("RGB", img.size, (255,255,255))
            src = img.convert("RGBA") if img.mode != "RGBA" else img
            bg.paste(src, mask=src.split()[3])
            return bg
        if img.mode not in ("RGB","L"):
            return img.convert("RGB")
    elif pil_fmt == "ICO":
        return img.convert("RGBA")
    elif pil_fmt == "BMP":
        if img.mode in ("RGBA", "LA", "PA"):
            # BMP has no alpha channel — composite onto white background
            bg = Image.new("RGB", img.size, (255, 255, 255))
            src_img = img.convert("RGBA") if img.mode != "RGBA" else img
            bg.paste(src_img, mask=src_img.split()[3])
            return bg
        if img.mode == "P":
            return img.convert("RGB")
        if img.mode not in ("RGB", "L"):
            return img.convert("RGB")
    elif pil_fmt == "TIFF":
        if img.mode == "P":
            return img.convert("RGBA")
        if img.mode == "1":
            return img.convert("L")
    return img
