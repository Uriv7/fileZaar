import sys
"""
engines/archive.py — Archive conversion
Extract source → repack to target format. All paths absolute.
"""
import asyncio, zipfile, tarfile, shutil
from pathlib import Path
from typing import Callable, Awaitable
from core.logger import get_logger
logger = get_logger(__name__)

class ArchiveEngine:
    async def convert(self, input_path, target_format, output_dir, progress_cb, output_stem=None):
        src = input_path.suffix.lstrip(".").lower()
        tgt = target_format.lower().lstrip(".")
        # Absolute paths
        inp  = input_path.resolve()
        odir = output_dir.resolve()
        odir.mkdir(parents=True, exist_ok=True)

        await progress_cb(10, f"Extracting {src.upper()}…")
        xdir = odir / "_extracted"
        xdir.mkdir(parents=True, exist_ok=True)

        try:
            await asyncio.get_event_loop().run_in_executor(None, self._extract, inp, src, xdir)
        except Exception as e:
            shutil.rmtree(xdir, ignore_errors=True)
            raise RuntimeError(f"Extraction failed: {e}")

        await progress_cb(55, f"Repacking as {tgt.upper()}…")
        try:
            stem = output_stem or inp.stem
            out_name = await asyncio.get_event_loop().run_in_executor(
                None, self._pack, xdir, tgt, odir, stem)
        finally:
            shutil.rmtree(xdir, ignore_errors=True)

        out_path = odir / out_name
        if not out_path.exists():
            raise FileNotFoundError(f"Archive output not found: {out_path}")
        await progress_cb(95, "Done!")
        size = out_path.stat().st_size
        logger.info(f"Archive OK: {inp.name} → {out_name} ({size:,} B)")
        return {"filename": out_name, "size": size}

    def _extract(self, inp: Path, ext: str, dest: Path):
        if ext == "zip":
            with zipfile.ZipFile(inp, "r") as z:
                z.extractall(dest)
        elif ext in ("tar",):
            with tarfile.open(inp, "r") as t:
                t.extractall(dest, filter="data") if sys.version_info >= (3, 12) else t.extractall(dest)
        elif ext == "gz":
            # Could be .tar.gz or plain .gz
            try:
                with tarfile.open(inp, "r:gz") as t:
                    t.extractall(dest, filter="data") if sys.version_info >= (3, 12) else t.extractall(dest)
            except tarfile.ReadError:
                import gzip
                out = dest / inp.stem
                with gzip.open(inp,"rb") as f, open(out,"wb") as g:
                    g.write(f.read())
        elif ext == "bz2":
            try:
                with tarfile.open(inp, "r:bz2") as t:
                    t.extractall(dest, filter="data") if sys.version_info >= (3, 12) else t.extractall(dest)
            except tarfile.ReadError:
                import bz2
                out = dest / inp.stem
                with bz2.open(inp,"rb") as f, open(out,"wb") as g:
                    g.write(f.read())
        elif ext == "xz":
            try:
                with tarfile.open(inp, "r:xz") as t:
                    t.extractall(dest, filter="data") if sys.version_info >= (3, 12) else t.extractall(dest)
            except tarfile.ReadError:
                import lzma
                out = dest / inp.stem
                with lzma.open(inp,"rb") as f, open(out,"wb") as g:
                    g.write(f.read())
        elif ext == "7z":
            try:
                import py7zr
                with py7zr.SevenZipFile(inp, mode="r") as z:
                    z.extractall(path=dest)
            except ImportError:
                raise RuntimeError("Run: pip install py7zr")
        elif ext == "rar":
            try:
                import rarfile
                with rarfile.RarFile(inp) as r:
                    r.extractall(dest)
            except ImportError:
                raise RuntimeError(
                    "Run: pip install rarfile\n"
                    "Also install unrar binary:\n"
                    "  macOS: brew install rar\n"
                    "  Ubuntu: sudo apt install unrar\n"
                    "  Windows: https://www.rarlab.com/rar_add.htm"
                )
        else:
            raise ValueError(f"Unsupported archive format: .{ext}")

    def _pack(self, source: Path, tgt: str, out_dir: Path, stem: str) -> str:
        if tgt == "zip":
            fn = f"{stem}.zip"
            out = out_dir / fn
            with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
                for f in source.rglob("*"):
                    if f.is_file():
                        z.write(f, f.relative_to(source))
            return fn
        elif tgt == "7z":
            try:
                import py7zr
            except ImportError:
                raise RuntimeError("Run: pip install py7zr")
            fn = f"{stem}.7z"
            out = out_dir / fn
            with py7zr.SevenZipFile(out, "w") as z:
                z.writeall(source, arcname=".")
            return fn
        elif tgt == "tar":
            fn = f"{stem}.tar"
            out = out_dir / fn
            with tarfile.open(out, "w") as t:
                t.add(source, arcname=".")
            return fn
        elif tgt in ("tar.gz", "gz"):
            fn = f"{stem}.tar.gz"
            out = out_dir / fn
            with tarfile.open(out, "w:gz") as t:
                t.add(source, arcname=".")
            return fn
        elif tgt == "bz2":
            fn = f"{stem}.tar.bz2"
            out = out_dir / fn
            with tarfile.open(out, "w:bz2") as t:
                t.add(source, arcname=".")
            return fn
        else:
            raise ValueError(f"Unsupported archive output: .{tgt}")
