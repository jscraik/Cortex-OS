#!/usr/bin/env python3
"""
Batched Inference System for MLX Models
Efficient request batching with priority queues and thermal awareness
"""

import asyncio
import json
import logging
import time
import uuid
from collections.abc import Callable
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class RequestPriority(Enum):
    """Request priority levels"""

    LOW = 0
    NORMAL = 1
    HIGH = 2
    CRITICAL = 3


@dataclass
class InferenceRequest:
    """Individual inference request"""

    id: str
    prompt: str
    priority: RequestPriority
    timestamp: float
    model_name: str
    max_tokens: int = 512
    temperature: float = 0.7
    metadata: dict[str, Any] = field(default_factory=dict)
    callback: Callable | None = None

    def __lt__(self, other):
        # Higher priority and older timestamp come first
        if self.priority.value != other.priority.value:
            return self.priority.value > other.priority.value
        return self.timestamp < other.timestamp


@dataclass
class InferenceResponse:
    """Inference response with metadata"""

    request_id: str
    text: str
    tokens_generated: int
    inference_time_ms: float
    queue_time_ms: float
    total_time_ms: float
    model_used: str
    batch_size: int
    error: str | None = None


class BatchedMLXInference:
    """
    Efficient batched inference system for MLX models

    Features:
    - Priority-based request queuing
    - Configurable batch sizes with thermal awareness
    - Request timeout handling
    - Performance metrics and monitoring
    - Integration with thermal management
    """

    def __init__(
        self, batch_size: int = 4, timeout_ms: int = 100, max_queue_size: int = 1000
    ):
        self.batch_size = batch_size
        self.timeout_ms = timeout_ms
        self.max_queue_size = max_queue_size

        # Request queues by priority
        self.request_queues: dict[RequestPriority, asyncio.Queue] = {
            priority: asyncio.Queue(maxsize=max_queue_size // len(RequestPriority))
            for priority in RequestPriority
        }

        # Pending responses
        self.pending_responses: dict[str, asyncio.Future] = {}

        # Batch processing
        self.current_batch: list[InferenceRequest] = []
        self.processing_batch = False

        # Performance metrics
        self.total_requests = 0
        self.total_batches = 0
        self.total_processing_time = 0.0
        self.average_batch_size = 0.0
        self.requests_by_priority = {p: 0 for p in RequestPriority}

        # Error tracking
        self.failed_requests = 0
        self.timeout_requests = 0

        # Processing control
        self._processing_task: asyncio.Task | None = None
        self._shutdown_event = asyncio.Event()

        # Thermal integration
        self.thermal_guard = None
        self.adaptive_batching = True

        logger.info(
            f"Batched inference initialized (batch_size={batch_size}, timeout={timeout_ms}ms)"
        )

    def set_thermal_guard(self, thermal_guard) -> None:
        """Set thermal guard for adaptive batching"""
        self.thermal_guard = thermal_guard
        logger.info("Thermal guard integration enabled")

    async def start_processing(self) -> None:
        """Start the batch processing task"""
        if self._processing_task and not self._processing_task.done():
            logger.warning("Batch processing already running")
            return

        logger.info("Starting batch processing")
        self._shutdown_event.clear()
        self._processing_task = asyncio.create_task(self._processing_loop())

    async def stop_processing(self) -> None:
        """Stop batch processing"""
        logger.info("Stopping batch processing")
        self._shutdown_event.set()

        if self._processing_task:
            try:
                await asyncio.wait_for(self._processing_task, timeout=5.0)
            except TimeoutError:
                logger.warning("Processing task did not stop gracefully")
                self._processing_task.cancel()

    async def add_request(
        self,
        prompt: str,
        model_name: str,
        priority: RequestPriority = RequestPriority.NORMAL,
        max_tokens: int = 512,
        temperature: float = 0.7,
        metadata: dict[str, Any] | None = None,
    ) -> InferenceResponse:
        """
        Add inference request to queue and wait for response

        Args:
            prompt: Input prompt
            model_name: Model to use for inference
            priority: Request priority level
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            metadata: Additional metadata

        Returns:
            InferenceResponse with generated text and metrics
        """
        request_id = str(uuid.uuid4())

        request = InferenceRequest(
            id=request_id,
            prompt=prompt,
            priority=priority,
            timestamp=time.time(),
            model_name=model_name,
            max_tokens=max_tokens,
            temperature=temperature,
            metadata=metadata or {},
        )

        # Create future for response
        response_future = asyncio.Future()
        self.pending_responses[request_id] = response_future

        # Update metrics
        self.total_requests += 1
        self.requests_by_priority[priority] += 1

        try:
            # Handle high priority requests immediately
            if priority == RequestPriority.CRITICAL:
                logger.debug(f"Processing critical request {request_id} immediately")
                response = await self._process_single_request(request)
                response_future.set_result(response)
                return response

            # Add to appropriate priority queue
            queue = self.request_queues[priority]

            try:
                queue.put_nowait(request)
                logger.debug(f"Added request {request_id} to {priority.name} queue")
            except asyncio.QueueFull:
                error_response = InferenceResponse(
                    request_id=request_id,
                    text="",
                    tokens_generated=0,
                    inference_time_ms=0,
                    queue_time_ms=0,
                    total_time_ms=0,
                    model_used=model_name,
                    batch_size=0,
                    error="Queue full",
                )
                self.failed_requests += 1
                return error_response

            # Wait for response with timeout
            try:
                response = await asyncio.wait_for(
                    response_future,
                    timeout=30.0,  # 30 second timeout
                )
                return response

            except TimeoutError:
                self.timeout_requests += 1
                logger.warning(f"Request {request_id} timed out")

                # Clean up
                if request_id in self.pending_responses:
                    del self.pending_responses[request_id]

                return InferenceResponse(
                    request_id=request_id,
                    text="",
                    tokens_generated=0,
                    inference_time_ms=0,
                    queue_time_ms=30000,
                    total_time_ms=30000,
                    model_used=model_name,
                    batch_size=0,
                    error="Request timeout",
                )

        except Exception as e:
            logger.error(f"Error processing request {request_id}: {e}")
            self.failed_requests += 1

            return InferenceResponse(
                request_id=request_id,
                text="",
                tokens_generated=0,
                inference_time_ms=0,
                queue_time_ms=0,
                total_time_ms=0,
                model_used=model_name,
                batch_size=0,
                error=str(e),
            )

    async def _processing_loop(self) -> None:
        """Main batch processing loop"""
        try:
            while not self._shutdown_event.is_set():
                # Collect requests for batching
                batch = await self._collect_batch()

                if batch:
                    # Process the batch
                    await self._process_batch(batch)
                else:
                    # No requests available, wait briefly
                    try:
                        await asyncio.wait_for(
                            self._shutdown_event.wait(), timeout=0.01
                        )
                        break
                    except TimeoutError:
                        continue

        except Exception as e:
            logger.error(f"Error in processing loop: {e}")
        finally:
            # Complete any pending requests with errors
            await self._cleanup_pending_requests()
            logger.info("Batch processing loop stopped")

    async def _collect_batch(self) -> list[InferenceRequest]:
        """Collect requests for batch processing"""
        batch = []
        target_batch_size = await self._get_adaptive_batch_size()

        # Collect from highest priority first
        for priority in sorted(RequestPriority, key=lambda p: p.value, reverse=True):
            queue = self.request_queues[priority]

            while len(batch) < target_batch_size:
                try:
                    # Wait briefly for requests
                    request = await asyncio.wait_for(
                        queue.get(), timeout=self.timeout_ms / 1000.0
                    )
                    batch.append(request)

                    # If we have a high priority request, process immediately
                    if priority in [RequestPriority.CRITICAL, RequestPriority.HIGH]:
                        break

                except TimeoutError:
                    break

            if batch and priority in [RequestPriority.CRITICAL, RequestPriority.HIGH]:
                break

        return batch

    async def _get_adaptive_batch_size(self) -> int:
        """Get adaptive batch size based on thermal state"""
        base_batch_size = self.batch_size

        if not self.adaptive_batching or not self.thermal_guard:
            return base_batch_size

        try:
            recommendation = self.thermal_guard.get_thermal_recommendation()
            return recommendation.get("recommended_batch_size", base_batch_size)
        except Exception as e:
            logger.debug(f"Could not get thermal recommendation: {e}")
            return base_batch_size

    async def _process_batch(self, batch: list[InferenceRequest]) -> None:
        """Process a batch of requests"""
        if not batch:
            return

        batch_start_time = time.time()
        batch_size = len(batch)

        logger.debug(f"Processing batch of {batch_size} requests")

        try:
            # Group by model for efficient processing
            model_groups = {}
            for request in batch:
                model_name = request.model_name
                if model_name not in model_groups:
                    model_groups[model_name] = []
                model_groups[model_name].append(request)

            # Process each model group
            for model_name, model_requests in model_groups.items():
                await self._process_model_group(
                    model_name, model_requests, batch_start_time
                )

            # Update batch metrics
            self.total_batches += 1
            batch_time = (time.time() - batch_start_time) * 1000
            self.total_processing_time += batch_time

            # Update average batch size
            self.average_batch_size = (
                self.average_batch_size * (self.total_batches - 1) + batch_size
            ) / self.total_batches

        except Exception as e:
            logger.error(f"Error processing batch: {e}")

            # Send error responses for all requests in batch
            for request in batch:
                await self._send_error_response(request, str(e), batch_start_time)

    async def _process_model_group(
        self, model_name: str, requests: list[InferenceRequest], batch_start_time: float
    ) -> None:
        """Process requests for a specific model"""
        # For now, process each request individually
        # In a full implementation, we could batch prompts for the same model

        for request in requests:
            try:
                response = await self._process_single_request(request, batch_start_time)

                # Send response back to waiting coroutine
                if request.id in self.pending_responses:
                    future = self.pending_responses[request.id]
                    if not future.done():
                        future.set_result(response)
                    del self.pending_responses[request.id]

            except Exception as e:
                logger.error(f"Error processing request {request.id}: {e}")
                await self._send_error_response(request, str(e), batch_start_time)

    async def _process_single_request(
        self, request: InferenceRequest, batch_start_time: float | None = None
    ) -> InferenceResponse:
        """Process a single inference request"""
        if batch_start_time is None:
            batch_start_time = time.time()

        inference_start_time = time.time()
        queue_time_ms = (inference_start_time - request.timestamp) * 1000

        try:
            # Mock inference for now - in production this would call the model
            await asyncio.sleep(0.1)  # Simulate inference time

            generated_text = f"[{request.model_name}] Generated response to: {request.prompt[:50]}..."
            tokens_generated = min(request.max_tokens, len(generated_text.split()))

            inference_time_ms = (time.time() - inference_start_time) * 1000
            total_time_ms = (time.time() - request.timestamp) * 1000

            return InferenceResponse(
                request_id=request.id,
                text=generated_text,
                tokens_generated=tokens_generated,
                inference_time_ms=inference_time_ms,
                queue_time_ms=queue_time_ms,
                total_time_ms=total_time_ms,
                model_used=request.model_name,
                batch_size=1,  # Since we're processing individually for now
            )

        except Exception as e:
            logger.error(f"Inference failed for request {request.id}: {e}")
            raise

    async def _send_error_response(
        self, request: InferenceRequest, error_message: str, batch_start_time: float
    ) -> None:
        """Send error response for a failed request"""
        queue_time_ms = (time.time() - request.timestamp) * 1000

        error_response = InferenceResponse(
            request_id=request.id,
            text="",
            tokens_generated=0,
            inference_time_ms=0,
            queue_time_ms=queue_time_ms,
            total_time_ms=queue_time_ms,
            model_used=request.model_name,
            batch_size=0,
            error=error_message,
        )

        if request.id in self.pending_responses:
            future = self.pending_responses[request.id]
            if not future.done():
                future.set_result(error_response)
            del self.pending_responses[request.id]

        self.failed_requests += 1

    async def _cleanup_pending_requests(self) -> None:
        """Clean up any pending requests on shutdown"""
        for request_id, future in list(self.pending_responses.items()):
            if not future.done():
                error_response = InferenceResponse(
                    request_id=request_id,
                    text="",
                    tokens_generated=0,
                    inference_time_ms=0,
                    queue_time_ms=0,
                    total_time_ms=0,
                    model_used="unknown",
                    batch_size=0,
                    error="System shutdown",
                )
                future.set_result(error_response)

        self.pending_responses.clear()

    def get_queue_stats(self) -> dict[str, Any]:
        """Get current queue statistics"""
        queue_sizes = {
            priority.name: queue.qsize()
            for priority, queue in self.request_queues.items()
        }

        total_queue_size = sum(queue_sizes.values())

        return {
            "total_queue_size": total_queue_size,
            "queue_sizes_by_priority": queue_sizes,
            "pending_responses": len(self.pending_responses),
            "current_batch_size": len(self.current_batch),
            "processing_batch": self.processing_batch,
            "max_queue_size": self.max_queue_size,
        }

    def get_performance_stats(self) -> dict[str, Any]:
        """Get performance statistics"""
        success_rate = (self.total_requests - self.failed_requests) / max(
            self.total_requests, 1
        )

        avg_processing_time = self.total_processing_time / max(self.total_batches, 1)

        return {
            "total_requests": self.total_requests,
            "total_batches": self.total_batches,
            "failed_requests": self.failed_requests,
            "timeout_requests": self.timeout_requests,
            "success_rate": round(success_rate, 3),
            "average_batch_size": round(self.average_batch_size, 2),
            "average_processing_time_ms": round(avg_processing_time, 2),
            "requests_by_priority": dict(self.requests_by_priority),
            "current_batch_size_setting": self.batch_size,
            "timeout_ms": self.timeout_ms,
            "adaptive_batching_enabled": self.adaptive_batching,
        }

    def set_batch_size(self, new_batch_size: int) -> None:
        """Update batch size"""
        old_size = self.batch_size
        self.batch_size = max(1, min(new_batch_size, 32))  # Clamp between 1-32
        logger.info(f"Batch size updated: {old_size} -> {self.batch_size}")

    def set_timeout(self, new_timeout_ms: int) -> None:
        """Update batch timeout"""
        old_timeout = self.timeout_ms
        self.timeout_ms = max(10, min(new_timeout_ms, 10000))  # Clamp between 10ms-10s
        logger.info(f"Batch timeout updated: {old_timeout}ms -> {self.timeout_ms}ms")


if __name__ == "__main__":
    # Demo batched inference
    async def demo():
        inference_system = BatchedMLXInference(batch_size=3, timeout_ms=200)

        # Start processing
        await inference_system.start_processing()

        # Submit test requests
        tasks = []
        for i in range(10):
            priority = RequestPriority.HIGH if i % 3 == 0 else RequestPriority.NORMAL

            task = inference_system.add_request(
                prompt=f"Test request {i}", model_name="gemma-3-270m", priority=priority
            )
            tasks.append(task)

        # Wait for all responses
        responses = await asyncio.gather(*tasks)

        # Print results
        for response in responses:
            print(f"Request {response.request_id}: {response.text[:50]}...")
            print(f"  Queue time: {response.queue_time_ms:.1f}ms")
            print(f"  Total time: {response.total_time_ms:.1f}ms")
            print()

        # Print statistics
        queue_stats = inference_system.get_queue_stats()
        perf_stats = inference_system.get_performance_stats()

        print("Queue Stats:", json.dumps(queue_stats, indent=2))
        print("Performance Stats:", json.dumps(perf_stats, indent=2))

        # Stop processing
        await inference_system.stop_processing()

    asyncio.run(demo())
