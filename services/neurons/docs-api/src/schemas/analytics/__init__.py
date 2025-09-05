"""Analytics schemas package."""

from .dashboard import DashboardMetricsResponse
from .engagement import (
    ABTestResponse,
    ABTestVariant,
    ContentPopularityItem,
    UserEngagementMetrics,
)
from .events import SearchEventCreate, UserEventCreate, UserEventResponse
from .performance import PerformanceEndpoint, PerformanceMetricsResponse
from .search import SearchAnalyticsQuery, SearchAnalyticsResponse

__all__ = [
    "ABTestResponse",
    "ABTestVariant",
    "ContentPopularityItem",
    "DashboardMetricsResponse",
    "PerformanceEndpoint",
    "PerformanceMetricsResponse",
    "SearchAnalyticsQuery",
    "SearchAnalyticsResponse",
    "SearchEventCreate",
    "UserEngagementMetrics",
    "UserEventCreate",
    "UserEventResponse",
]

