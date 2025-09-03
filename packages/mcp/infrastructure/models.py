"""Database models for MCP core functionality."""

import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from .database import Base


class User(Base):
    """User model for authentication and authorization."""

    __tablename__ = "users"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Core fields
    username: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    # Profile fields
    full_name: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Metadata
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # JSON fields for extensible data
    preferences: Mapped[dict[str, Any] | None] = mapped_column(JSON, default={})
    metadata_: Mapped[dict[str, Any] | None] = mapped_column(
        "metadata", JSON, default={}
    )

    # Relationships
    sessions: Mapped[list["UserSession"]] = relationship(
        "UserSession", back_populates="user", cascade="all, delete-orphan"
    )
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="created_by_user")

    # Constraints
    __table_args__ = (
        CheckConstraint("LENGTH(username) >= 3", name="username_min_length"),
        CheckConstraint("LENGTH(email) >= 5", name="email_min_length"),
        Index("ix_users_active_email", "is_active", "email"),
        Index("ix_users_created", "created_at"),
    )

    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"


class UserSession(Base):
    """User session model for JWT and session management."""

    __tablename__ = "user_sessions"

    # Primary key - using UUID for security
    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # Foreign key
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Session data
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    refresh_token_hash: Mapped[str | None] = mapped_column(String(255), index=True)

    # Session metadata
    ip_address: Mapped[str | None] = mapped_column(String(45))  # Support IPv6
    user_agent: Mapped[str | None] = mapped_column(Text)
    device_fingerprint: Mapped[str | None] = mapped_column(String(255))

    # Timing
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    last_accessed: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revoked_reason: Mapped[str | None] = mapped_column(String(255))

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="sessions")

    # Constraints
    __table_args__ = (
        Index("ix_sessions_user_active", "user_id", "is_active"),
        Index("ix_sessions_expires", "expires_at"),
        Index("ix_sessions_token", "token_hash"),
    )

    def __repr__(self):
        return f"<UserSession(id='{self.id}', user_id={self.user_id}, active={self.is_active})>"


class Task(Base):
    """Task model for MCP task queue and execution tracking."""

    __tablename__ = "tasks"

    # Primary key
    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # Core task fields
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(50), default="pending", nullable=False, index=True
    )
    priority: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, index=True
    )

    # Task data
    parameters: Mapped[dict[str, Any] | None] = mapped_column(JSON, default={})
    result: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    error_info: Mapped[dict[str, Any] | None] = mapped_column(JSON)

    # Execution tracking
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    retry_delay: Mapped[float | None] = mapped_column(Float)  # seconds

    # Timing
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Ownership and tracking
    created_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), index=True
    )
    worker_id: Mapped[str | None] = mapped_column(String(255), index=True)
    correlation_id: Mapped[str | None] = mapped_column(String(36), index=True)

    # Progress tracking
    progress_percentage: Mapped[float | None] = mapped_column(Float, default=0.0)
    progress_message: Mapped[str | None] = mapped_column(Text)

    # Metadata
    tags: Mapped[list[str] | None] = mapped_column(JSON, default=[])
    metadata_: Mapped[dict[str, Any] | None] = mapped_column(
        "metadata", JSON, default={}
    )

    # Relationships
    created_by_user: Mapped[Optional["User"]] = relationship(
        "User", back_populates="tasks"
    )
    dependencies: Mapped[list["TaskDependency"]] = relationship(
        "TaskDependency",
        foreign_keys="TaskDependency.dependent_task_id",
        back_populates="dependent_task",
        cascade="all, delete-orphan",
    )
    dependents: Mapped[list["TaskDependency"]] = relationship(
        "TaskDependency",
        foreign_keys="TaskDependency.prerequisite_task_id",
        back_populates="prerequisite_task",
        cascade="all, delete-orphan",
    )

    # Constraints
    __table_args__ = (
        CheckConstraint("priority >= -100 AND priority <= 100", name="priority_range"),
        CheckConstraint(
            "progress_percentage >= 0.0 AND progress_percentage <= 100.0",
            name="progress_range",
        ),
        CheckConstraint("max_attempts >= 1", name="max_attempts_positive"),
        CheckConstraint("attempts >= 0", name="attempts_non_negative"),
        Index("ix_tasks_status_priority", "status", "priority"),
        Index("ix_tasks_type_status", "type", "status"),
        Index("ix_tasks_created", "created_at"),
        Index("ix_tasks_scheduled", "scheduled_at"),
        Index("ix_tasks_worker", "worker_id"),
    )

    def __repr__(self):
        return f"<Task(id='{self.id}', name='{self.name}', status='{self.status}', priority={self.priority})>"


class TaskDependency(Base):
    """Task dependency relationships for complex workflows."""

    __tablename__ = "task_dependencies"

    # Composite primary key
    dependent_task_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True
    )
    prerequisite_task_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True
    )

    # Dependency metadata
    dependency_type: Mapped[str] = mapped_column(
        String(50), default="sequential", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    dependent_task: Mapped["Task"] = relationship(
        "Task", foreign_keys=[dependent_task_id], back_populates="dependencies"
    )
    prerequisite_task: Mapped["Task"] = relationship(
        "Task", foreign_keys=[prerequisite_task_id], back_populates="dependents"
    )

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "dependent_task_id != prerequisite_task_id", name="no_self_dependency"
        ),
        Index("ix_task_deps_dependent", "dependent_task_id"),
        Index("ix_task_deps_prerequisite", "prerequisite_task_id"),
    )

    def __repr__(self):
        return f"<TaskDependency(dependent='{self.dependent_task_id}', prerequisite='{self.prerequisite_task_id}')>"


class Connection(Base):
    """MCP connection tracking and management."""

    __tablename__ = "connections"

    # Primary key
    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )

    # Connection details
    transport_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    host: Mapped[str | None] = mapped_column(String(255))
    port: Mapped[int | None] = mapped_column(Integer)
    path: Mapped[str | None] = mapped_column(String(500))

    # Status tracking
    status: Mapped[str] = mapped_column(
        String(50), default="active", nullable=False, index=True
    )
    last_heartbeat: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_error: Mapped[str | None] = mapped_column(Text)

    # Performance metrics
    total_requests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    successful_requests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_requests: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_response_time_ms: Mapped[float | None] = mapped_column(Float)

    # Timing
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    connected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    disconnected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Metadata
    client_info: Mapped[dict[str, Any] | None] = mapped_column(JSON, default={})
    metadata_: Mapped[dict[str, Any] | None] = mapped_column(
        "metadata", JSON, default={}
    )

    # Constraints
    __table_args__ = (
        Index("ix_connections_transport_status", "transport_type", "status"),
        Index("ix_connections_heartbeat", "last_heartbeat"),
        Index("ix_connections_created", "created_at"),
    )

    def __repr__(self):
        return f"<Connection(id='{self.id}', transport='{self.transport_type}', status='{self.status}')>"


class AuditLog(Base):
    """Audit log for tracking important system events."""

    __tablename__ = "audit_logs"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Event details
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    event_category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(
        String(20), default="info", nullable=False, index=True
    )

    # Actor information
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    username: Mapped[str | None] = mapped_column(String(50), index=True)
    ip_address: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(Text)

    # Event data
    resource_type: Mapped[str | None] = mapped_column(String(100), index=True)
    resource_id: Mapped[str | None] = mapped_column(String(255), index=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Request context
    correlation_id: Mapped[str | None] = mapped_column(String(36), index=True)
    session_id: Mapped[str | None] = mapped_column(String(36), index=True)
    request_id: Mapped[str | None] = mapped_column(String(36))

    # Event payload and results
    before_state: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    after_state: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    event_data: Mapped[dict[str, Any] | None] = mapped_column(JSON, default={})

    # Timing and success
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    success: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text)

    # Constraints
    __table_args__ = (
        Index("ix_audit_logs_timestamp", "timestamp"),
        Index("ix_audit_logs_user_action", "user_id", "action"),
        Index("ix_audit_logs_resource", "resource_type", "resource_id"),
        Index("ix_audit_logs_category_severity", "event_category", "severity"),
        Index("ix_audit_logs_correlation", "correlation_id"),
    )

    def __repr__(self):
        return f"<AuditLog(id={self.id}, event_type='{self.event_type}', action='{self.action}', success={self.success})>"


class SystemSetting(Base):
    """System configuration and settings storage."""

    __tablename__ = "system_settings"

    # Primary key
    key: Mapped[str] = mapped_column(String(255), primary_key=True)

    # Setting data
    value: Mapped[str | None] = mapped_column(Text)
    value_type: Mapped[str] = mapped_column(
        String(50), default="string", nullable=False
    )
    encrypted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Metadata
    category: Mapped[str | None] = mapped_column(String(100), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    default_value: Mapped[str | None] = mapped_column(Text)

    # Validation
    validation_regex: Mapped[str | None] = mapped_column(String(500))
    allowed_values: Mapped[list[str] | None] = mapped_column(JSON)
    min_value: Mapped[float | None] = mapped_column(Float)
    max_value: Mapped[float | None] = mapped_column(Float)

    # Change tracking
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))

    # Constraints
    __table_args__ = (
        CheckConstraint("LENGTH(key) >= 1", name="key_not_empty"),
        Index("ix_system_settings_category", "category"),
        Index("ix_system_settings_updated", "updated_at"),
    )

    def __repr__(self):
        return f"<SystemSetting(key='{self.key}', type='{self.value_type}', encrypted={self.encrypted})>"
