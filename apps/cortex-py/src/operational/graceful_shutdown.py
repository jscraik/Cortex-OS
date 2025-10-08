"""
Graceful Shutdown Handler for Cortex-Py (Phase 5.2)

Handles SIGTERM/SIGINT signals with clean resource cleanup.

Following CODESTYLE.md:
- snake_case naming
- Type hints on all public functions
- Guard clauses for readability
- Functions ≤40 lines
- brAInwav branding in outputs
"""

import asyncio
import signal
import logging
from typing import Callable, List, Dict, Any

logger = logging.getLogger(__name__)


class ShutdownError(Exception):
    """brAInwav shutdown error"""

    pass


class GracefulShutdown:
    """
    Graceful shutdown handler for production services.
    
    Handles SIGTERM/SIGINT signals, executes cleanup tasks,
    and ensures clean shutdown without data loss.
    """

    def __init__(self, shutdown_timeout: int = 30):
        """
        Initialize graceful shutdown handler.
        
        Args:
            shutdown_timeout: Maximum seconds to wait for cleanup
        """
        self.shutdown_timeout = shutdown_timeout
        self.shutdown_event = asyncio.Event()
        self.cleanup_tasks: List[Callable] = []
        self.signals_registered = False
        self._shutting_down = False

    def register_signal_handlers(self) -> bool:
        """
        Register SIGTERM and SIGINT signal handlers.
        
        Returns:
            True if handlers registered successfully
        
        Following CODESTYLE.md: Guard clauses
        """
        # Guard: already registered
        if self.signals_registered:
            return True

        try:
            # Register SIGTERM (Kubernetes termination)
            signal.signal(signal.SIGTERM, self._handle_signal)

            # Register SIGINT (Ctrl+C)
            signal.signal(signal.SIGINT, self._handle_signal)

            self.signals_registered = True
            logger.info("brAInwav: Signal handlers registered (SIGTERM, SIGINT)")

            return True
        except Exception as e:
            logger.error(f"brAInwav: Failed to register signal handlers - {e}")
            return False

    def register_cleanup(self, cleanup_fn: Callable):
        """
        Register cleanup function to execute on shutdown.
        
        Args:
            cleanup_fn: Async function to call during shutdown
        
        Following CODESTYLE.md: Guard clauses
        """
        # Guard: validate callable
        if not callable(cleanup_fn):
            raise ShutdownError("brAInwav: Cleanup function must be callable")

        self.cleanup_tasks.append(cleanup_fn)
        logger.debug(f"brAInwav: Registered cleanup task: {cleanup_fn.__name__}")

    async def shutdown(self):
        """
        Execute graceful shutdown with timeout.
        
        Runs all cleanup tasks with timeout enforcement.
        
        Following CODESTYLE.md: Guard clauses
        """
        # Guard: already shutting down
        if self._shutting_down:
            logger.warning("brAInwav: Shutdown already in progress")
            return

        self._shutting_down = True
        logger.info("brAInwav: Starting graceful shutdown")

        try:
            # Execute all cleanup tasks with timeout
            await asyncio.wait_for(
                self._execute_cleanup_tasks(),
                timeout=self.shutdown_timeout,
            )

            logger.info("brAInwav: All cleanup tasks completed")
        except asyncio.TimeoutError:
            logger.warning(
                f"brAInwav: Shutdown timeout ({self.shutdown_timeout}s) - forcing shutdown"
            )
        except Exception as e:
            logger.error(f"brAInwav: Shutdown error - {e}")
        finally:
            # Set shutdown event
            self.shutdown_event.set()
            logger.info("brAInwav: Graceful shutdown complete")

    async def _execute_cleanup_tasks(self):
        """
        Execute all registered cleanup tasks.
        
        Following CODESTYLE.md: Error handling with guard clauses
        """
        # Guard: no tasks
        if not self.cleanup_tasks:
            logger.info("brAInwav: No cleanup tasks registered")
            return

        logger.info(f"brAInwav: Executing {len(self.cleanup_tasks)} cleanup tasks")

        for i, task in enumerate(self.cleanup_tasks, 1):
            try:
                logger.debug(f"brAInwav: Running cleanup task {i}/{len(self.cleanup_tasks)}: {task.__name__}")
                await task()
            except Exception as e:
                logger.error(f"brAInwav: Cleanup task {task.__name__} failed - {e}")
                # Continue with other tasks even if one fails

    def is_shutting_down(self) -> bool:
        """
        Check if shutdown is in progress.
        
        Returns:
            True if shutting down
        
        Following CODESTYLE.md: Simple boolean check
        """
        return self._shutting_down or self.shutdown_event.is_set()

    def get_metadata(self) -> Dict[str, Any]:
        """
        Get shutdown handler metadata.
        
        Returns:
            Metadata dictionary
        
        Following CODESTYLE.md: Simple metadata
        """
        return {
            "brAInwav": {
                "service": "graceful-shutdown",
                "version": "1.0.0",
            },
            "timeout": self.shutdown_timeout,
            "tasks_registered": len(self.cleanup_tasks),
            "signals_registered": self.signals_registered,
            "shutting_down": self._shutting_down,
        }

    def _handle_signal(self, signum: int, frame):
        """
        Handle OS signals (SIGTERM, SIGINT).
        
        Args:
            signum: Signal number
            frame: Current stack frame
        
        Following CODESTYLE.md: Guard clauses
        """
        signal_name = signal.Signals(signum).name
        logger.info(f"brAInwav: Received signal {signal_name}")

        # Guard: already shutting down
        if self._shutting_down:
            logger.warning("brAInwav: Shutdown already in progress, ignoring signal")
            return

        # Create shutdown task in event loop
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(self.shutdown())
            else:
                loop.run_until_complete(self.shutdown())
        except Exception as e:
            logger.error(f"brAInwav: Failed to initiate shutdown - {e}")


# Global shutdown manager instance
_shutdown_manager: GracefulShutdown | None = None


def get_shutdown_manager(timeout: int = 30) -> GracefulShutdown:
    """
    Get global shutdown manager instance.
    
    Args:
        timeout: Shutdown timeout in seconds
    
    Returns:
        Shutdown manager instance
    
    Following CODESTYLE.md: Singleton pattern
    """
    global _shutdown_manager

    if _shutdown_manager is None:
        _shutdown_manager = GracefulShutdown(shutdown_timeout=timeout)

    return _shutdown_manager


def reset_shutdown_manager() -> None:
    """Reset the global shutdown manager (testing utility)."""
    global _shutdown_manager
    _shutdown_manager = None
