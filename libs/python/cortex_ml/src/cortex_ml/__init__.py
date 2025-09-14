"""cortex_ml package exports shared ML helpers.

Currently exposes:
 - instructor_client: utilities for creating Instructor/OpenAI-compatible clients and helpers.
"""

from . import instructor_client  # re-export for tests and consumers

__all__ = ["instructor_client"]
