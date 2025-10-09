"""
Multimodal Types for Cortex-Py (Phase 3.1)

Following CODESTYLE.md:
- snake_case naming
- Type hints on all public functions
- PascalCase for classes/enums
- brAInwav branding in docstrings
"""

from enum import Enum
from typing import Optional, TypedDict


class Modality(str, Enum):
    """
    brAInwav Modality Enum
    
    Defines supported content types for multimodal memory storage.
    Matches Prisma schema enum for consistency across TypeScript/Python.
    """

    TEXT = "TEXT"
    IMAGE = "IMAGE"
    AUDIO = "AUDIO"
    VIDEO = "VIDEO"


class MemoryProvenance(TypedDict):
    """Provenance metadata for memory items"""

    source: str  # 'user' | 'agent' | 'system'
    actor: Optional[str]
    hash: Optional[str]


class Memory(TypedDict, total=False):
    """
    brAInwav Memory Type
    
    Matches TypeScript Memory interface from packages/memories/src/domain/types.ts
    Supports multimodal content with TEXT, IMAGE, AUDIO, VIDEO modalities.
    """

    id: str
    kind: str  # 'note' | 'event' | 'artifact' | 'embedding'
    text: Optional[str]
    vector: Optional[list[float]]
    tags: list[str]
    ttl: Optional[str]
    createdAt: str
    updatedAt: str
    provenance: MemoryProvenance
    policy: Optional[dict]
    embeddingModel: Optional[str]
    metadata: Optional[dict]
    # Multimodal fields (Phase 3.1)
    modality: Optional[Modality]
    content: Optional[bytes]
    contentType: Optional[str]
    contentSize: Optional[int]


# File validation constants (brAInwav standards)
IMAGE_FORMATS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff"}
AUDIO_FORMATS = {".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac"}
VIDEO_FORMATS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_AUDIO_SIZE = 50 * 1024 * 1024  # 50MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100MB
MAX_TEXT_SIZE = 1 * 1024 * 1024  # 1MB


def get_max_size_for_modality(modality: Modality) -> int:
    """
    Get maximum file size for a given modality.
    
    Args:
        modality: Content modality type
    
    Returns:
        Maximum size in bytes
    
    Following CODESTYLE.md: Guard clauses for readability
    """
    if modality == Modality.TEXT:
        return MAX_TEXT_SIZE
    if modality == Modality.IMAGE:
        return MAX_IMAGE_SIZE
    if modality == Modality.AUDIO:
        return MAX_AUDIO_SIZE
    if modality == Modality.VIDEO:
        return MAX_VIDEO_SIZE

    # Fallback for unknown modality (should never reach here)
    return MAX_TEXT_SIZE


def get_allowed_formats_for_modality(modality: Modality) -> set[str]:
    """
    Get allowed file extensions for a given modality.
    
    Args:
        modality: Content modality type
    
    Returns:
        Set of allowed file extensions (with leading dots)
    
    Following CODESTYLE.md: Guard clauses for readability
    """
    if modality == Modality.TEXT:
        return {".txt", ".md", ".json", ".xml", ".html"}
    if modality == Modality.IMAGE:
        return IMAGE_FORMATS
    if modality == Modality.AUDIO:
        return AUDIO_FORMATS
    if modality == Modality.VIDEO:
        return VIDEO_FORMATS

    # Fallback
    return set()
