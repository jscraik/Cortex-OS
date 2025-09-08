"""Content validation schemas."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class ContentValidationRequest(BaseModel):
    """Content validation request schema."""

    content: str = Field(..., description="Content to validate")
    content_type: str = Field("markdown", description="Content type")
    validation_rules: list[str] | None = Field(
        None, description="Specific validation rules to apply"
    )

    @field_validator("content_type")
    @classmethod
    def validate_content_type(cls, v: str) -> str:
        allowed_types = {"markdown", "html", "rst", "plain_text", "asciidoc"}
        if v not in allowed_types:
            raise ValueError(f"Content type must be one of: {', '.join(allowed_types)}")
        return v


class ValidationIssue(BaseModel):
    """Content validation issue schema."""

    type: str = Field(..., description="Issue type")
    severity: str = Field(..., description="Issue severity")
    message: str = Field(..., description="Issue description")
    line_number: int | None = Field(None, description="Line number where issue occurs")
    column: int | None = Field(None, description="Column where issue occurs")
    suggestion: str | None = Field(None, description="Suggested fix")

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        allowed_severities = {"info", "warning", "error", "critical"}
        if v not in allowed_severities:
            raise ValueError(
                f"Severity must be one of: {', '.join(allowed_severities)}"
            )
        return v


class ContentValidationResponse(BaseModel):
    """Content validation response schema."""

    valid: bool = Field(..., description="Whether content is valid")
    issues: list[ValidationIssue] = Field(..., description="Validation issues")
    word_count: int = Field(..., description="Word count")
    reading_time_minutes: int = Field(..., description="Estimated reading time")
    quality_score: float = Field(..., description="Content quality score")
    accessibility_score: float = Field(..., description="Accessibility score")
    suggestions: list[str] = Field(..., description="Improvement suggestions")
    validated_at: datetime = Field(..., description="Validation timestamp")
