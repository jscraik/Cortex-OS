#!/usr/bin/env python3
"""
Test script for cortex-py A2A real core integration

This script demonstrates the new A2A core integration via stdio bridge.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add src to path for testing
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

from cortex_py.a2a import (
    create_a2a_bus,
    create_mlx_embedding_event,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def test_real_a2a_integration():
    """Test real A2A core integration."""
    logger.info("Testing cortex-py A2A real core integration")

    # Create A2A bus with real core integration
    bus = create_a2a_bus(source="urn:cortex:py:test", use_real_core=True)

    try:
        # Start the bus
        await bus.start()
        logger.info("A2A bus started successfully")

        # Check if it's using real core
        if hasattr(bus, "is_real_a2a_core") and bus.is_real_a2a_core():
            logger.info("✅ Using real A2A core integration")
        else:
            logger.warning("⚠️ Not using real A2A core integration")

        # Test event creation and publishing
        event = create_mlx_embedding_event(
            request_id="test_001",
            text_count=1,
            total_chars=42,
            processing_time=0.123,
            model_used="test-model",
            dimension=384,
            success=True,
        )

        logger.info(f"Created event: {event.type}")

        # Test publishing
        result = await bus.publish(event)
        logger.info(f"Published event successfully: {result}")

        # Test health check
        health = await bus.health_check()
        logger.info(f"Health check: {health}")

        # Keep running for a short time to test stdio communication
        logger.info("Testing stdio communication for 2 seconds...")
        await asyncio.sleep(2)

    except Exception as e:
        logger.error(f"Test failed: {e}", exc_info=True)
        return False
    finally:
        # Stop the bus
        try:
            await bus.stop()
            logger.info("A2A bus stopped successfully")
        except Exception as e:
            logger.error(f"Error stopping bus: {e}")

    logger.info("✅ Test completed successfully")
    return True


async def test_legacy_http_integration():
    """Test legacy HTTP integration for comparison."""
    logger.info("Testing cortex-py A2A legacy HTTP integration")

    # Create A2A bus with legacy HTTP transport
    bus = create_a2a_bus(source="urn:cortex:py:test", use_real_core=False)

    try:
        await bus.start()
        logger.info("Legacy A2A bus started successfully")

        # Test event publishing
        event = create_mlx_embedding_event(
            request_id="test_legacy_001",
            text_count=1,
            total_chars=42,
            processing_time=0.123,
            model_used="test-model",
            dimension=384,
            success=True,
        )

        # Note: This will likely fail since there's no HTTP endpoint running
        # but we're testing the interface
        try:
            result = await bus.publish(event)
            logger.info(f"Legacy: Published event result: {result}")
        except Exception as e:
            logger.info(f"Legacy: Expected HTTP failure: {e}")

        await bus.stop()
        logger.info("Legacy A2A bus stopped successfully")

    except Exception as e:
        logger.error(f"Legacy test error: {e}")
        return False

    return True


async def main():
    """Main test function."""
    logger.info("🚀 Starting cortex-py A2A integration tests")

    success = True

    # Test real A2A core integration
    logger.info("=" * 60)
    if not await test_real_a2a_integration():
        success = False

    # Test legacy HTTP integration
    logger.info("=" * 60)
    if not await test_legacy_http_integration():
        success = False

    # Summary
    logger.info("=" * 60)
    if success:
        logger.info("🎉 All tests passed!")
    else:
        logger.error("❌ Some tests failed!")

    return success


if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        logger.info("Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        sys.exit(1)
