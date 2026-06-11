"""
core/validator.py — File integrity and security checks.
Runs before conversion to reject dangerous or malformed files.
"""

import re
from pathlib import Path

from core.logger import get_logger

logger = get_logger(__name__)

MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024  # 2 GB

BLOCKED_EXTENSIONS = {
    ".exe", ".bat", ".sh", ".cmd", ".ps1", ".vbs", ".js", ".jar",
    ".py", ".rb", ".php", ".pl", ".com", ".scr", ".msi", ".dll",
    ".so", ".dylib", ".app",
}

SAFE_FILENAME_RE = re.compile(r"^[\w\s\-.()\[\]]+$")


class FileValidator:
    def validate(self, filename: str, content_type: str, size: int) -> dict:
        """
        Returns {"valid": True} or {"valid": False, "reason": "..."}
        """
        if not filename:
            return {"valid": False, "reason": "No filename provided."}

        path = Path(filename)
        ext = path.suffix.lower()

        # Block executable types
        if ext in BLOCKED_EXTENSIONS:
            logger.warning(f"Blocked file extension: {ext} ({filename})")
            return {
                "valid": False,
                "reason": f"Extension '{ext}' is not allowed for security reasons.",
            }

        # Filename sanity (no path traversal)
        if ".." in filename or "/" in filename or "\\" in filename:
            return {"valid": False, "reason": "Invalid filename (path traversal attempt)."}

        # Size check
        if size > MAX_FILE_SIZE:
            human = f"{size / (1024**3):.1f} GB"
            return {
                "valid": False,
                "reason": f"File too large ({human}). Maximum allowed is 2 GB.",
            }

        logger.info(f"Validated: {filename} ({size} bytes, {content_type})")
        return {"valid": True}

    def validate_format_pair(self, source_ext: str, target_format: str) -> dict:
        """
        Validates that the conversion pair makes semantic sense.
        """
        from core.router import FORMAT_MAP, OUTPUT_FORMATS

        src_cat = FORMAT_MAP.get(source_ext.lower())
        if not src_cat:
            return {"valid": False, "reason": f"Unsupported source format: .{source_ext}"}

        allowed_targets = OUTPUT_FORMATS.get(src_cat, [])
        if isinstance(allowed_targets, dict):
            # media has video/audio sub-keys
            flat = []
            for v in allowed_targets.values():
                flat.extend(v)
            allowed_targets = flat

        if target_format.lower() not in allowed_targets:
            return {
                "valid": False,
                "reason": (
                    f"Cannot convert .{source_ext} to .{target_format}. "
                    f"Supported targets: {', '.join(sorted(allowed_targets))}"
                ),
            }
        return {"valid": True}
