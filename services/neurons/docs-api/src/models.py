"""SQLAlchemy models for docs-api service."""

from core.database import Base
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column


class Example(Base):
    """Simple example model for testing database helpers."""

    __tablename__ = "examples"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
