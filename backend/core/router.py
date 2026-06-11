from pathlib import Path
from typing import Callable, Awaitable, Optional
from core.logger import get_logger
logger = get_logger(__name__)

FORMAT_MAP = {
    "jpg":"image","jpeg":"image","png":"image","webp":"image","gif":"image",
    "bmp":"image","tiff":"image","tif":"image","avif":"image","ico":"image",
    "svg":"image","heic":"image","heif":"image",
    "mp4":"media","mkv":"media","avi":"media","mov":"media","webm":"media",
    "flv":"media","wmv":"media","m4v":"media","ts":"media","3gp":"media",
    "ogv":"media","vob":"media","mpeg":"media",
    "mp3":"media","wav":"media","flac":"media","ogg":"media","aac":"media",
    "m4a":"media","opus":"media","aiff":"media","aif":"media","wma":"media",
    "pdf":"document","docx":"document","doc":"document","odt":"document",
    "rtf":"document","txt":"document","html":"document","htm":"document",
    "md":"document","epub":"document","ppt":"document","pptx":"document","xlsx":"document",
    "xls":"document","csv":"document","json":"document","xml":"document",
    "css":"document",
    "zip":"archive","rar":"archive","7z":"archive","tar":"archive",
    "gz":"archive","bz2":"archive","xz":"archive",
}

OUTPUT_FORMATS = {
    "image":    ["jpg","png","webp","gif","bmp","tiff","avif","ico","pdf"],
    "media":    ["mp4","mkv","avi","mov","webm","gif","mp3","wav","flac","ogg","aac","m4a","opus"],
    "document": ["pdf","docx","txt","html","md","odt","rtf","epub","csv","json","xlsx","xml","pptx"],
    "archive":  ["zip","7z","tar","tar.gz"],
}

GIF_VIDEO_TARGETS = {"mp4","mkv","webm","avi","mov"}

class ConversionRouter:
    def __init__(self):
        from engines.image    import ImageEngine
        from engines.media    import MediaEngine
        from engines.document import DocumentEngine
        from engines.archive  import ArchiveEngine
        self._engines = {
            "image":    ImageEngine(),
            "media":    MediaEngine(),
            "document": DocumentEngine(),
            "archive":  ArchiveEngine(),
        }

    # Formats we can detect but not convert — provide helpful error messages
    UNSUPPORTED_FRIENDLY = {
        "pages": "Apple Pages (.pages) files cannot be converted directly. Open the file in Apple Pages and export it as DOCX or PDF first.",
        "numbers": "Apple Numbers (.numbers) files cannot be converted directly. Export as XLSX or CSV from Numbers first.",
        "key": "Apple Keynote (.key) files cannot be converted directly. Export as PPTX or PDF from Keynote first.",
        "indd": "Adobe InDesign (.indd) files are not supported. Export as PDF from InDesign first.",
        "ai": "Adobe Illustrator (.ai) files are not supported. Export as SVG or PDF from Illustrator first.",
        "psd": "Photoshop (.psd) files are not supported. Export as PNG, JPG, or TIFF from Photoshop first.",
        "sketch": "Sketch (.sketch) files are not supported. Export assets from Sketch first.",
        "exe": "Executable files (.exe) cannot be converted.",
        "dmg": "Disk image files (.dmg) cannot be converted.",
    }

    def detect(self, path: Path, target_format: str = "") -> str:
        ext = path.suffix.lstrip(".").lower()
        if ext == "gif" and target_format.lower() in GIF_VIDEO_TARGETS:
            return "media"
        # Check friendly unsupported list first
        if ext in self.UNSUPPORTED_FRIENDLY:
            raise ValueError(self.UNSUPPORTED_FRIENDLY[ext])
        cat = FORMAT_MAP.get(ext)
        if not cat:
            raise ValueError(
                f"Unsupported format: '.{ext}'. "
                f"Supported input formats: {', '.join(sorted(FORMAT_MAP.keys()))}"
            )
        return cat

    async def convert(self, input_path: Path, target_format: str,
                      output_dir: Path, progress_cb: Callable[[int,str],Awaitable[None]],
                      output_stem: Optional[str] = None) -> dict:
        if not input_path.exists():
            raise FileNotFoundError(f"Input file not found: {input_path}")
        output_dir.mkdir(parents=True, exist_ok=True)
        cat = self.detect(input_path, target_format)
        await progress_cb(5, f"Detected as {cat}…")
        return await self._engines[cat].convert(
            input_path=input_path, target_format=target_format,
            output_dir=output_dir, progress_cb=progress_cb,
            output_stem=output_stem)

    def get_supported_formats(self):
        cats = {}
        for ext, cat in FORMAT_MAP.items():
            cats.setdefault(cat, {"inputs":[], "outputs":[]})
            if ext not in cats[cat]["inputs"]:
                cats[cat]["inputs"].append(ext)
        for cat, outs in OUTPUT_FORMATS.items():
            if cat in cats:
                cats[cat]["outputs"] = list(outs)
        return {"categories": cats, "format_map": FORMAT_MAP}
