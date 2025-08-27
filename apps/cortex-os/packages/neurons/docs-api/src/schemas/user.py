"""Pydantic schemas for user-related requests and responses."""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr, validator


class UserCreate(BaseModel):
    """User creation schema."""
    email: Optional[EmailStr] = Field(None, description="User email address")
    username: Optional[str] = Field(None, description="Username", min_length=3, max_length=50)
    role: Optional[str] = Field("reader", description="User role")
    
    @validator('username')
    def validate_username(cls, v):
        if v and not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must contain only alphanumeric characters, hyphens, and underscores')
        return v
    
    @validator('role')
    def validate_role(cls, v):
        allowed_roles = {'reader', 'contributor', 'editor', 'admin'}
        if v not in allowed_roles:
            raise ValueError(f'Role must be one of: {", ".join(allowed_roles)}')
        return v


class UserUpdate(BaseModel):
    """User update schema."""
    email: Optional[EmailStr] = Field(None, description="User email address")
    username: Optional[str] = Field(None, description="Username", min_length=3, max_length=50)
    role: Optional[str] = Field(None, description="User role")
    is_active: Optional[bool] = Field(None, description="User active status")
    
    @validator('username')
    def validate_username(cls, v):
        if v and not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must contain only alphanumeric characters, hyphens, and underscores')
        return v
    
    @validator('role')
    def validate_role(cls, v):
        if v:
            allowed_roles = {'reader', 'contributor', 'editor', 'admin'}
            if v not in allowed_roles:
                raise ValueError(f'Role must be one of: {", ".join(allowed_roles)}')
        return v


class UserResponse(BaseModel):
    """User response schema."""
    id: str = Field(..., description="User ID")
    email: Optional[str] = Field(None, description="User email address")
    username: Optional[str] = Field(None, description="Username")
    role: str = Field(..., description="User role")
    is_active: bool = Field(..., description="User active status")
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    
    class Config:
        from_attributes = True


class UserPreferenceCreate(BaseModel):
    """User preference creation schema."""
    preference_key: str = Field(..., description="Preference key", min_length=1, max_length=100)
    preference_value: Dict[str, Any] = Field(..., description="Preference value as JSON")
    
    @validator('preference_key')
    def validate_preference_key(cls, v):
        allowed_keys = {
            'theme', 'display', 'reading', 'notifications', 'privacy',
            'search', 'content_filters', 'accessibility', 'language'
        }
        if v not in allowed_keys:
            raise ValueError(f'Preference key must be one of: {", ".join(allowed_keys)}')
        return v


class UserPreferenceResponse(BaseModel):
    """User preference response schema."""
    id: int = Field(..., description="Preference ID")
    user_id: str = Field(..., description="User ID")
    preference_key: str = Field(..., description="Preference key")
    preference_value: Dict[str, Any] = Field(..., description="Preference value")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True


class BookmarkCreate(BaseModel):
    """Bookmark creation schema."""
    document_id: str = Field(..., description="Document ID", min_length=1, max_length=255)
    document_path: str = Field(..., description="Document path", min_length=1, max_length=500)
    title: str = Field(..., description="Document title", min_length=1, max_length=500)
    section: Optional[str] = Field(None, description="Specific section", max_length=200)
    notes: Optional[str] = Field(None, description="User notes", max_length=1000)
    tags: Optional[List[str]] = Field(None, description="User-defined tags")
    
    @validator('tags')
    def validate_tags(cls, v):
        if v:
            # Limit number of tags and tag length
            if len(v) > 10:
                raise ValueError('Maximum 10 tags allowed')
            for tag in v:
                if len(tag) > 50:
                    raise ValueError('Tag length must be 50 characters or less')
                if not tag.strip():
                    raise ValueError('Tags cannot be empty')
        return v


class BookmarkResponse(BaseModel):
    """Bookmark response schema."""
    id: int = Field(..., description="Bookmark ID")
    user_id: str = Field(..., description="User ID")
    document_id: str = Field(..., description="Document ID")
    document_path: str = Field(..., description="Document path")
    title: str = Field(..., description="Document title")
    section: Optional[str] = Field(None, description="Specific section")
    notes: Optional[str] = Field(None, description="User notes")
    tags: Optional[List[str]] = Field(None, description="User-defined tags")
    created_at: datetime = Field(..., description="Creation timestamp")
    
    class Config:
        from_attributes = True


class UserProgressResponse(BaseModel):
    """User progress response schema."""
    id: int = Field(..., description="Progress ID")
    user_id: str = Field(..., description="User ID")
    document_id: str = Field(..., description="Document ID")
    document_path: str = Field(..., description="Document path")
    progress_percentage: float = Field(..., description="Completion percentage (0-100)")
    last_position: Optional[str] = Field(None, description="Last reading position")
    time_spent_seconds: int = Field(..., description="Total time spent in seconds")
    completed: bool = Field(..., description="Whether document is completed")
    last_accessed: datetime = Field(..., description="Last access timestamp")
    created_at: datetime = Field(..., description="Creation timestamp")
    
    class Config:
        from_attributes = True


class PersonalizedContentItem(BaseModel):
    """Personalized content item schema."""
    id: str = Field(..., description="Document ID")
    title: str = Field(..., description="Document title")
    path: str = Field(..., description="Document path")
    description: Optional[str] = Field(None, description="Document description")
    category: Optional[str] = Field(None, description="Document category")
    quality_score: Optional[float] = Field(None, description="Quality score")
    reading_time_minutes: Optional[int] = Field(None, description="Estimated reading time")
    recommendation_score: Optional[float] = Field(None, description="Recommendation relevance score")
    recommendation_reason: Optional[str] = Field(None, description="Why this was recommended")


class PersonalizedContentResponse(BaseModel):
    """Personalized content response schema."""
    user_id: str = Field(..., description="User ID")
    recommended_content: List[PersonalizedContentItem] = Field(..., description="Recommended content")
    popular_content: List[PersonalizedContentItem] = Field(..., description="Popular content")
    recent_content: List[PersonalizedContentItem] = Field(..., description="Recently updated content")
    bookmarks: List[Dict[str, Any]] = Field(..., description="User bookmarks")
    reading_stats: Dict[str, Any] = Field(..., description="Reading statistics")
    preferences: Dict[str, Any] = Field(..., description="User preferences")
    generated_at: datetime = Field(..., description="Generation timestamp")


class ReadingStats(BaseModel):
    """Reading statistics schema."""
    total_documents: int = Field(..., description="Total documents accessed")
    completed_documents: int = Field(..., description="Completed documents")
    completion_rate: float = Field(..., description="Completion rate (0-1)")
    total_time_minutes: int = Field(..., description="Total reading time in minutes")
    recent_activity_count: int = Field(..., description="Recent activity count")
    average_session_minutes: int = Field(..., description="Average session duration")


class ReadingGoals(BaseModel):
    """Reading goals schema."""
    monthly_goal: int = Field(..., description="Monthly reading goal")
    monthly_progress: int = Field(..., description="Current monthly progress")
    monthly_completion_rate: float = Field(..., description="Monthly completion rate")
    streak_days: int = Field(..., description="Current reading streak in days")
    next_milestone: int = Field(..., description="Documents until next milestone")


class UserDashboardResponse(BaseModel):
    """User dashboard response schema."""
    user_id: str = Field(..., description="User ID")
    reading_stats: ReadingStats = Field(..., description="Reading statistics")
    recent_progress: List[Dict[str, Any]] = Field(..., description="Recent progress")
    recent_bookmarks: List[Dict[str, Any]] = Field(..., description="Recent bookmarks")
    goals: ReadingGoals = Field(..., description="Reading goals")
    generated_at: datetime = Field(..., description="Generation timestamp")


class UserSessionCreate(BaseModel):
    """User session creation schema."""
    user_id: Optional[str] = Field(None, description="User ID for authenticated sessions")
    session_data: Dict[str, Any] = Field(..., description="Session data")
    ttl: Optional[int] = Field(None, description="Session TTL in seconds")


class UserSessionResponse(BaseModel):
    """User session response schema."""
    session_id: str = Field(..., description="Session ID")
    user_id: Optional[str] = Field(None, description="User ID")
    session_data: Dict[str, Any] = Field(..., description="Session data")
    created_at: datetime = Field(..., description="Creation timestamp")
    expires_at: datetime = Field(..., description="Expiration timestamp")


class BulkUserOperation(BaseModel):
    """Bulk user operation schema."""
    operation: str = Field(..., description="Operation type: create, update, delete")
    user_ids: List[str] = Field(..., description="List of user IDs")
    data: Optional[Dict[str, Any]] = Field(None, description="Operation data")
    
    @validator('operation')
    def validate_operation(cls, v):
        allowed_operations = {'create', 'update', 'delete', 'activate', 'deactivate'}
        if v not in allowed_operations:
            raise ValueError(f'Operation must be one of: {", ".join(allowed_operations)}')
        return v
    
    @validator('user_ids')
    def validate_user_ids(cls, v):
        if len(v) > 100:
            raise ValueError('Maximum 100 users per bulk operation')
        return v


class BulkUserOperationResponse(BaseModel):
    """Bulk user operation response schema."""
    operation: str = Field(..., description="Operation type")
    total_users: int = Field(..., description="Total users in operation")
    successful: int = Field(..., description="Successfully processed users")
    failed: int = Field(..., description="Failed users")
    errors: List[Dict[str, str]] = Field(..., description="Error details")
    processed_at: datetime = Field(..., description="Processing timestamp")