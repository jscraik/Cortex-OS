"""Document relation schemas."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class DocumentRelationCreate(BaseModel):
    """Document relation creation schema."""

    source_document_id: str = Field(..., description="Source document ID")
    target_document_id: str = Field(..., description="Target document ID")
    relation_type: str = Field(..., description="Relation type")
    weight: float | None = Field(1.0, description="Relation weight", ge=0.0, le=1.0)
    context: str | None = Field(None, description="Relation context", max_length=1000)

    @field_validator("relation_type")
    @classmethod
    def validate_relation_type(cls, v: str) -> str:
        allowed_types = {
            "link",
            "reference",
            "dependency",
            "prerequisite",
            "follow_up",
            "related",
            "alternative",
            "supersedes",
            "deprecated_by",
        }
        if v not in allowed_types:
            raise ValueError(
                f"Relation type must be one of: {', '.join(allowed_types)}"
            )
        return v


class DocumentRelationResponse(BaseModel):
    """Document relation response schema."""

    id: int = Field(..., description="Relation ID")
    source_document_id: str = Field(..., description="Source document ID")
    target_document_id: str = Field(..., description="Target document ID")
    relation_type: str = Field(..., description="Relation type")
    weight: float = Field(..., description="Relation weight")
    context: str | None = Field(None, description="Relation context")
    created_at: datetime = Field(..., description="Creation timestamp")

    class Config:
        from_attributes = True

