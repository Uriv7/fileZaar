"""
engines/media.py — Video & Audio via FFmpeg
Fixes: [Errno 2] when ffmpeg not found, spaces in filenames, proper error messages
"""
import asyncio, shutil, sys, os
from pathlib import Path
from typing import Callable, Awaitable
from core.logger import get_logger
logger = get_logger(__name__)
_FFMPEG_CACHE: dict = {}  # module-level tool path cache

AUDIO = {"mp3","wav","flac","ogg","aac","m4a","opus","wma","aiff","aif"}
VIDEO = {"mp4","mkv","avi","mov","webm","flv","wmv","m4v","ts","3gp","ogv","vob","mpeg"}

VIDEO_CODEC = {
    "mp4":  ["-c:v","libx264","-crf","22","-preset","medium","-c:a","aac","-b:a","192k","-movflags","+faststart"],
    "mkv":  ["-c:v","libx264","-crf","22","-preset","medium","-c:a","aac","-b:a","128k"],
    "webm": ["-c:v","libvpx-vp9","-crf","30","-b:v","0","-c:a","libopus","-b:a","128k"],
    "avi":  ["-c:v","mpeg4","-q:v","4","-c:a","libmp3lame","-q:a","4"],
    "mov":  ["-c:v","libx264","-crf","22","-preset","medium","-c:a","aac","-b:a","192k"],
    "flv":  ["-c:v","libx264","-crf","24","-c:a","aac","-b:a","128k"],
    "wmv":  ["-c:v","msmpeg4v3","-b:v","1500k","-c:a","wmav2","-b:a","192k"],
    "3gp":  ["-c:v","libx264","-crf","28","-c:a","aac","-b:a","64k"],
    "gif":  ["-vf","fps=8,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse","-loop","0"],
}
AUDIO_CODEC = {
    "mp3":  ["-c:a","libmp3lame","-q:a","2"],
    "aac":  ["-c:a","aac","-b:a","192k"],
    "m4a":  ["-c:a","aac","-b:a","192k"],
    "ogg":  ["-c:a","libvorbis","-q:a","5"],
    "opus": ["-c:a","libopus","-b:a","128k"],
    "flac": ["-c:a","flac"],
    "wav":  ["-c:a","pcm_s16le"],
    "aiff": ["-c:a","pcm_s16be"],
    "wma":  ["-c:a","wmav2","-b:a","192k"],
}

def _find_ffmpeg():
    """Find ffmpeg: check bundled bin/ first, then system PATH."""
    plat = sys.platform
    sub  = "win64" if plat.startswith("win") else ("darwin" if plat == "darwin" else "linux")
    suf  = ".exe" if plat.startswith("win") else ""
    base = Path(__file__).parents[2] / "bin" / sub

    for name in ("ffmpeg", "ffprobe"):
        bundled = base / f"{name}{suf}"
        if bundled.exists():
            logger.info(f"Using bundled {name}: {bundled}")

    ff  = shutil.which("ffmpeg")  or str(base / f"ffmpeg{suf}")
    ffp = shutil.which("ffprobe") or str(base / f"ffprobe{suf}")

    # Verify binary actually exists
    if not shutil.which("ffmpeg") and not Path(ff).exists():
        raise RuntimeError(
            "FFmpeg is not installed!\n\n"
            "To fix this, install FFmpeg:\n"
            "  macOS:   brew install ffmpeg\n"
            "  Ubuntu:  sudo apt install ffmpeg\n"
            "  Windows: winget install ffmpeg\n"
            "  OR download from: https://ffmpeg.org/download.html\n\n"
            "After installing, restart the backend server."
        )
    return ff, ffp


class MediaEngine:
    def __init__(self):
        try:
            self.ff, self.ffp = _find_ffmpeg()
            logger.info(f"FFmpeg found: {self.ff}")
        except RuntimeError as e:
            # Store error message — raised at conversion time with full context
            self._missing_error = str(e)
            self.ff = None
            self.ffp = None

    async def convert(self, input_path: Path, target_format: str,
                      output_dir: Path, progress_cb: Callable[[int, str], Awaitable[None]],
                      output_stem=None) -> dict:
        # Raise helpful error if FFmpeg is missing
        if self.ff is None:
            raise RuntimeError(getattr(self, '_missing_error',
                "FFmpeg not found. Install: brew install ffmpeg (macOS) | "
                "sudo apt install ffmpeg (Linux) | winget install ffmpeg (Windows)"))

        tgt     = target_format.lower().lstrip(".")
        src_ext = input_path.suffix.lstrip(".").lower()
        is_asrc = src_ext in AUDIO
        is_atgt = tgt in AUDIO

        await progress_cb(10, "Probing media file…")
        dur, has_audio, has_video = await self._probe(input_path)

        # Guard: audio extraction from audio-less file
        if is_atgt and not has_audio:
            raise RuntimeError(
                f"Cannot extract audio: '{input_path.name}' has no audio stream.\n"
                f"This file has no audio track."
            )
        # Guard: video conversion from audio-only file — inform user
        if not is_atgt and tgt not in ("gif",) and not has_video and not is_asrc:
            raise RuntimeError(
                f"Cannot convert to video: '{input_path.name}' has no video stream.\n"
                f"This file contains audio only. Try converting to MP3, AAC, or WAV instead."
            )

        stem = output_stem or input_path.stem
        out_name = f"{stem}.{tgt}"
        output_dir.mkdir(parents=True, exist_ok=True)
        out_path = output_dir / out_name

        cmd = self._cmd(input_path, out_path, tgt, is_asrc, is_atgt, has_audio)
        logger.info(f"FFmpeg: {' '.join(str(c) for c in cmd)}")
        await progress_cb(15, "Converting…")
        await self._run(cmd, dur, progress_cb)

        if not out_path.exists():
            raise RuntimeError(
                f"FFmpeg finished but output file was not created.\n"
                f"Expected: {out_path}\n"
                f"This usually means FFmpeg lacks a required codec.\n"
                f"Try: brew upgrade ffmpeg  (or reinstall FFmpeg)"
            )

        size = out_path.stat().st_size
        logger.info(f"Media OK: {input_path.name} → {out_name} ({size:,} B)")
        return {"filename": out_name, "size": size}

    def _cmd(self, inp: Path, out: Path, tgt: str, is_asrc: bool, is_atgt: bool, has_audio: bool = True) -> list:
        # Use resolved absolute string paths to avoid any working-directory issues
        inp_str = str(inp.resolve())
        out_str = str(out.resolve())

        cmd = [self.ff, "-y", "-i", inp_str]

        if tgt == "gif":
            # Cap GIF at 10 seconds to prevent massive output files
            cmd += ["-t", "10"]
            cmd += VIDEO_CODEC["gif"]
        elif is_atgt:
            cmd += AUDIO_CODEC.get(tgt, ["-c:a", "copy"])
            if not is_asrc:
                cmd += ["-vn"]  # strip video stream
        else:
            codec_args = VIDEO_CODEC.get(tgt, ["-c:v", "libx264", "-crf", "22", "-c:a", "aac"])
            if not has_audio:
                # Remove audio codec args, add -an to suppress no-audio warning
                filtered = []
                skip_next = False
                audio_flags = {"-c:a","-b:a","-ar","-ac"}
                for arg in codec_args:
                    if skip_next: skip_next = False; continue
                    if arg in audio_flags: skip_next = True; continue
                    if arg.startswith("aac") or arg.startswith("libopus") or arg.startswith("libvorbis"): continue
                    filtered.append(arg)
                codec_args = filtered + ["-an"]
            cmd += codec_args

        cmd += ["-progress", "pipe:1", "-nostats", out_str]
        return cmd

    async def _probe(self, inp: Path) -> tuple:
        """Returns (duration_secs, has_audio, has_video)"""
        if not self.ffp:
            return 0.0, True, True
        try:
            p = await asyncio.create_subprocess_exec(
                self.ffp, "-v", "error",
                "-show_entries", "format=duration:stream=codec_type",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(inp.resolve()),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            out, _ = await p.communicate()
            lines = out.decode().strip().split("\n")
            duration = 0.0
            has_audio = False
            has_video = False
            for line in lines:
                line = line.strip()
                if line == "audio": has_audio = True
                elif line == "video": has_video = True
                else:
                    try: duration = float(line)
                    except ValueError: pass
            return duration, has_audio, has_video
        except Exception:
            return 0.0, True, True

    async def _run(self, cmd: list, dur: float, cb: Callable):
        try:
            p = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except FileNotFoundError:
            raise RuntimeError(
                f"Cannot run FFmpeg — binary not found at: {cmd[0]}\n"
                "Install FFmpeg: brew install ffmpeg (macOS) | "
                "sudo apt install ffmpeg (Linux) | winget install ffmpeg (Windows)"
            )

        errbuf = []

        async def drain_stderr():
            while True:
                line = await p.stderr.readline()
                if not line:
                    break
                errbuf.append(line.decode(errors="replace"))

        asyncio.create_task(drain_stderr())

        t = 0.0
        while True:
            line = await p.stdout.readline()
            if not line:
                break
            s = line.decode(errors="replace").strip()
            if s.startswith("out_time_ms="):
                try:
                    t = int(s.split("=")[1]) / 1_000_000
                    pct = min(95, int(20 + (t / dur) * 75)) if dur > 0 else 50
                    await cb(pct, f"Converting… {t:.1f}s" + (f" / {dur:.1f}s" if dur > 0 else ""))
                except Exception:
                    pass

        await p.wait()

        if p.returncode != 0:
            err = "".join(errbuf[-30:])
            raise RuntimeError(
                f"FFmpeg failed (exit code {p.returncode}).\n"
                f"Error output:\n{err[-600:]}\n\n"
                f"Common fixes:\n"
                f"  • Ensure FFmpeg is up to date: brew upgrade ffmpeg\n"
                f"  • Check the input file is not corrupted\n"
                f"  • Try a different output format"
            )
