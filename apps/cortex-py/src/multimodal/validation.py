"""
Multimodal File Validation for Cortex-Py (Phase 3.1.2)

Following CODESTYLE.md:
- snake_case naming
- Type hints on all public functions
- Guard clauses for readability
- Functions ≤40 lines
- brAInwav branding in error messages
"""

from pathlib import Path
from typing import TypedDict

from .types import Modality, get_max_size_for_modality, get_allowed_formats_for_modality


class ValidationError(Exception):
    """brAInwav validation error for multimodal files"""

    pass


class ValidationResult(TypedDict):
    """Result of file validation"""

    valid: bool
    mime_type: str
    size: int
    message: str
    modality: Modality


# Magic number mappings for file type detection
MAGIC_NUMBERS = {
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"\xff\xd8\xff": "image/jpeg",
    b"GIF87a": "image/gif",
    b"GIF89a": "image/gif",
    b"BM": "image/bmp",
    b"II*\x00": "image/tiff",
    b"MM\x00*": "image/tiff",
    b"RIFF": "audio/wav",  # Needs further validation
    b"ID3": "audio/mpeg",
    b"\xff\xfb": "audio/mpeg",  # MP3 without ID3
    b"OggS": "audio/ogg",
    b"fLaC": "audio/flac",
}


def detect_file_type(content: bytes) -> str:
    """
    Detect file MIME type from magic numbers.
    
    Args:
        content: File binary content
    
    Returns:
        MIME type string
    
    Raises:
        ValidationError: If file type cannot be detected
    
    Following CODESTYLE.md: Guard clauses for readability
    """
    # Guard: empty file
    if not content or len(content) == 0:
        raise ValidationError("brAInwav: Cannot detect type of empty file")

    # Guard: file too small for magic number
    if len(content) < 4:
        raise ValidationError(
            f"brAInwav: File too small ({len(content)} bytes) for type detection"
        )

    # Check for MP4/MOV (ftyp atom at offset 4)
    if len(content) >= 12:
        if content[4:8] == b"ftyp":
            # MP4 variants
            if b"mp4" in content[8:12] or b"isom" in content[8:12]:
                return "video/mp4"
            if b"qt" in content[8:12]:
                return "video/quicktime"

    # Check magic numbers
    for magic, mime_type in MAGIC_NUMBERS.items():
        if content.startswith(magic):
            # Special handling for RIFF (could be WAV or WEBP)
            if magic == b"RIFF" and len(content) >= 12:
                if content[8:12] == b"WAVE":
                    return "audio/wav"
                if content[8:12] == b"WEBP":
                    return "image/webp"
            return mime_type

    # Check AVI
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"AVI ":
        return "video/avi"

    raise ValidationError(
        f"brAInwav: Unsupported or unrecognized file type (header: {content[:8].hex()})"
    )


def validate_file_size(size: int, modality: Modality) -> None:
    """
    Validate file size against modality limits.
    
    Args:
        size: File size in bytes
        modality: Content modality
    
    Raises:
        ValidationError: If size exceeds limit
    
    Following CODESTYLE.md: Guard clauses for validation
    """
    max_size = get_max_size_for_modality(modality)

    # Guard: size exceeds limit
    if size > max_size:
        max_mb = max_size / (1024 * 1024)
        actual_mb = size / (1024 * 1024)
        raise ValidationError(
            f"brAInwav: File size {actual_mb:.1f}MB exceeds {modality.value} "
            f"limit of {max_mb:.0f}MB"
        )


def validate_file_extension(extension: str, modality: Modality) -> None:
    """
    Validate file extension against modality.
    
    Args:
        extension: File extension (with or without leading dot)
        modality: Content modality
    
    Raises:
        ValidationError: If extension not allowed
    
    Following CODESTYLE.md: Guard clauses, normalize input
    """
    # Normalize extension
    ext = extension.lower()
    if not ext.startswith("."):
        ext = f".{ext}"

    allowed_formats = get_allowed_formats_for_modality(modality)

    # Guard: extension not in allowed list
    if ext not in allowed_formats:
        raise ValidationError(
            f"brAInwav: Extension '{extension}' not allowed for {modality.value}. "
            f"Allowed: {', '.join(sorted(allowed_formats))}"
        )


def validate_mime_type_matches_modality(
    mime_type: str, modality: Modality
) -> None:
    """
    Validate MIME type matches expected modality.
    
    Args:
        mime_type: Detected MIME type
        modality: Claimed modality
    
    Raises:
        ValidationError: If mismatch detected
    
    Following CODESTYLE.md: Guard clauses for validation
    """
    mime_prefix = mime_type.split("/")[0]

    expected_prefix_map = {
        Modality.TEXT: "text",
        Modality.IMAGE: "image",
        Modality.AUDIO: "audio",
        Modality.VIDEO: "video",
    }

    expected_prefix = expected_prefix_map.get(modality)

    # Guard: mismatch
    if expected_prefix and mime_prefix != expected_prefix:
        raise ValidationError(
            f"brAInwav: Modality mismatch - detected {mime_type} "
            f"but expected {modality.value}"
        )


def validate_multimodal_file(
    content: bytes, filename: str, modality: Modality
) -> ValidationResult:
    """
    Complete validation workflow for multimodal files.
    
    Args:
        content: File binary content
        filename: Original filename
        modality: Expected modality
    
    Returns:
        ValidationResult with metadata
    
    Raises:
        ValidationError: If any validation fails
    
    Following CODESTYLE.md: Orchestration function ≤40 lines
    """
    # Extract extension
    extension = Path(filename).suffix

    # Step 1: Validate extension
    validate_file_extension(extension, modality)

    # Step 2: Detect file type from magic numbers
    mime_type = detect_file_type(content)

    # Step 3: Validate MIME type matches modality
    validate_mime_type_matches_modality(mime_type, modality)

    # Step 4: Validate size
    file_size = len(content)
    validate_file_size(file_size, modality)

    # Return success result
    return ValidationResult(
        valid=True,
        mime_type=mime_type,
        size=file_size,
        message=f"brAInwav: {modality.value} file validated successfully",
        modality=modality,
    )
