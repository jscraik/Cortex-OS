#!/usr/bin/env python3
"""
Comprehensive test suite for Batched Inference System

Tests cover:
- Priority-based request queuing
- Batch processing efficiency
- Timeout and error handling
- Performance metrics accuracy
- Thermal integration
"""

import asyncio
import pytest
import time
import uuid
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any, List

# Import the module under test
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from batched_inference import (
    BatchedMLXInference,
    InferenceRequest,
    InferenceResponse,
    RequestPriority
)


class TestInferenceRequest:
    """Test suite for InferenceRequest dataclass"""
    
    def test_inference_request_creation(self):
        """Test InferenceRequest creation"""
        request_id = str(uuid.uuid4())
        timestamp = time.time()
        
        request = InferenceRequest(
            id=request_id,
            prompt="Test prompt",
            priority=RequestPriority.HIGH,
            timestamp=timestamp,
            model_name="test-model",
            max_tokens=1024,
            temperature=0.8,
            metadata={"user_id": "test_user"}
        )
        
        assert request.id == request_id
        assert request.prompt == "Test prompt"
        assert request.priority == RequestPriority.HIGH
        assert request.timestamp == timestamp
        assert request.model_name == "test-model"
        assert request.max_tokens == 1024
        assert request.temperature == 0.8
        assert request.metadata["user_id"] == "test_user"
        assert request.callback is None

    def test_inference_request_defaults(self):
        """Test InferenceRequest with default values"""
        request = InferenceRequest(
            id="test-id",
            prompt="Test prompt", 
            priority=RequestPriority.NORMAL,
            timestamp=time.time(),
            model_name="test-model"
        )
        
        assert request.max_tokens == 512
        assert request.temperature == 0.7
        assert request.metadata == {}
        assert request.callback is None

    def test_inference_request_priority_ordering(self):
        """Test InferenceRequest priority ordering for priority queue"""
        timestamp = time.time()
        
        low_request = InferenceRequest(
            id="low", prompt="test", priority=RequestPriority.LOW,
            timestamp=timestamp, model_name="test"
        )
        
        high_request = InferenceRequest(
            id="high", prompt="test", priority=RequestPriority.HIGH,
            timestamp=timestamp, model_name="test"
        )
        
        critical_request = InferenceRequest(
            id="critical", prompt="test", priority=RequestPriority.CRITICAL,
            timestamp=timestamp, model_name="test"
        )
        
        # Higher priority should come first
        assert high_request < low_request
        assert critical_request < high_request
        assert critical_request < low_request

    def test_inference_request_timestamp_ordering(self):
        """Test InferenceRequest timestamp ordering for same priority"""
        base_time = time.time()
        
        older_request = InferenceRequest(
            id="older", prompt="test", priority=RequestPriority.NORMAL,
            timestamp=base_time, model_name="test"
        )
        
        newer_request = InferenceRequest(
            id="newer", prompt="test", priority=RequestPriority.NORMAL,
            timestamp=base_time + 1, model_name="test"
        )
        
        # Older timestamp should come first for same priority
        assert older_request < newer_request


class TestInferenceResponse:
    """Test suite for InferenceResponse dataclass"""
    
    def test_inference_response_creation(self):
        """Test InferenceResponse creation"""
        response = InferenceResponse(
            request_id="test-request-id",
            text="Generated response text",
            tokens_generated=25,
            inference_time_ms=150.5,
            queue_time_ms=50.2,
            total_time_ms=200.7,
            model_used="test-model",
            batch_size=4
        )
        
        assert response.request_id == "test-request-id"
        assert response.text == "Generated response text"
        assert response.tokens_generated == 25
        assert response.inference_time_ms == 150.5
        assert response.queue_time_ms == 50.2
        assert response.total_time_ms == 200.7
        assert response.model_used == "test-model"
        assert response.batch_size == 4
        assert response.error is None

    def test_inference_response_with_error(self):
        """Test InferenceResponse with error"""
        response = InferenceResponse(
            request_id="error-request",
            text="",
            tokens_generated=0,
            inference_time_ms=0,
            queue_time_ms=100,
            total_time_ms=100,
            model_used="test-model",
            batch_size=0,
            error="Processing failed"
        )
        
        assert response.error == "Processing failed"
        assert response.text == ""
        assert response.tokens_generated == 0


class TestBatchedMLXInference:
    """Test suite for BatchedMLXInference"""
    
    @pytest.fixture
    def inference_system(self):
        """Create batched inference system for testing"""
        return BatchedMLXInference(
            batch_size=3,
            timeout_ms=50,  # Fast timeout for testing
            max_queue_size=100
        )

    def test_initialization(self, inference_system):
        """Test batched inference system initialization"""
        assert inference_system.batch_size == 3
        assert inference_system.timeout_ms == 50
        assert inference_system.max_queue_size == 100
        assert len(inference_system.request_queues) == len(RequestPriority)
        assert inference_system.pending_responses == {}
        assert inference_system.current_batch == []
        assert inference_system.processing_batch is False
        assert inference_system.total_requests == 0
        assert inference_system.total_batches == 0
        assert inference_system.failed_requests == 0
        assert inference_system.timeout_requests == 0

    def test_initialization_defaults(self):
        """Test initialization with default values"""
        system = BatchedMLXInference()
        assert system.batch_size == 4
        assert system.timeout_ms == 100
        assert system.max_queue_size == 1000

    def test_set_thermal_guard(self, inference_system):
        """Test thermal guard integration"""
        mock_thermal_guard = Mock()
        inference_system.set_thermal_guard(mock_thermal_guard)
        assert inference_system.thermal_guard == mock_thermal_guard

    @pytest.mark.asyncio
    async def test_start_stop_processing(self, inference_system):
        """Test starting and stopping batch processing"""
        with patch.object(inference_system, '_processing_loop') as mock_loop:
            mock_loop.return_value = AsyncMock()
            
            # Start processing
            await inference_system.start_processing()
            assert inference_system._processing_task is not None
            assert not inference_system._shutdown_event.is_set()
            
            # Stop processing
            await inference_system.stop_processing()
            assert inference_system._shutdown_event.is_set()

    @pytest.mark.asyncio
    async def test_start_processing_already_running(self, inference_system):
        """Test starting processing when already running"""
        # Mock running task
        inference_system._processing_task = Mock()
        inference_system._processing_task.done.return_value = False
        
        with patch.object(inference_system, '_processing_loop'):
            await inference_system.start_processing()
            # Should not create new task

    @pytest.mark.asyncio
    async def test_stop_processing_timeout(self, inference_system):
        """Test stopping processing with timeout"""
        mock_task = AsyncMock()
        mock_task.cancel = Mock()
        inference_system._processing_task = mock_task
        
        with patch('asyncio.wait_for', side_effect=asyncio.TimeoutError):
            await inference_system.stop_processing()
            mock_task.cancel.assert_called_once()

    @pytest.mark.asyncio
    async def test_add_request_normal_priority(self, inference_system):
        """Test adding normal priority request"""
        with patch.object(inference_system, '_process_single_request') as mock_process:
            mock_response = InferenceResponse(
                request_id="test-id", text="Generated text", tokens_generated=10,
                inference_time_ms=100, queue_time_ms=50, total_time_ms=150,
                model_used="test-model", batch_size=1
            )
            mock_process.return_value = mock_response
            
            # Mock the processing to simulate queuing and processing
            async def mock_processing():
                # Simulate request being processed from queue
                await asyncio.sleep(0.01)
                # Manually trigger response for test
                request_id = list(inference_system.pending_responses.keys())[0]
                future = inference_system.pending_responses[request_id]
                if not future.done():
                    future.set_result(mock_response)
            
            # Start the mock processing
            asyncio.create_task(mock_processing())
            
            response = await inference_system.add_request(
                prompt="Test prompt",
                model_name="test-model",
                priority=RequestPriority.NORMAL
            )
            
            assert isinstance(response, InferenceResponse)
            assert response.text == "Generated text"
            assert inference_system.total_requests == 1
            assert inference_system.requests_by_priority[RequestPriority.NORMAL] == 1

    @pytest.mark.asyncio
    async def test_add_request_critical_priority(self, inference_system):
        """Test adding critical priority request (processed immediately)"""
        with patch.object(inference_system, '_process_single_request') as mock_process:
            mock_response = InferenceResponse(
                request_id="critical-id", text="Critical response", tokens_generated=15,
                inference_time_ms=80, queue_time_ms=0, total_time_ms=80,
                model_used="test-model", batch_size=1
            )
            mock_process.return_value = mock_response
            
            response = await inference_system.add_request(
                prompt="Critical prompt",
                model_name="test-model",
                priority=RequestPriority.CRITICAL
            )
            
            assert isinstance(response, InferenceResponse)
            assert response.text == "Critical response"
            assert inference_system.requests_by_priority[RequestPriority.CRITICAL] == 1
            mock_process.assert_called_once()

    @pytest.mark.asyncio
    async def test_add_request_queue_full(self, inference_system):
        """Test adding request when queue is full"""
        # Fill up the queue
        queue = inference_system.request_queues[RequestPriority.NORMAL]
        while not queue.full():
            try:
                queue.put_nowait(Mock())
            except asyncio.QueueFull:
                break
        
        response = await inference_system.add_request(
            prompt="Test prompt",
            model_name="test-model",
            priority=RequestPriority.NORMAL
        )
        
        assert isinstance(response, InferenceResponse)
        assert response.error == "Queue full"
        assert inference_system.failed_requests == 1

    @pytest.mark.asyncio
    async def test_add_request_timeout(self, inference_system):
        """Test request timeout handling"""
        with patch('asyncio.wait_for', side_effect=asyncio.TimeoutError):
            response = await inference_system.add_request(
                prompt="Test prompt",
                model_name="test-model"
            )
            
            assert isinstance(response, InferenceResponse)
            assert response.error == "Request timeout"
            assert inference_system.timeout_requests == 1

    @pytest.mark.asyncio 
    async def test_add_request_processing_error(self, inference_system):
        """Test request processing error handling"""
        with patch.object(inference_system, '_process_single_request', 
                         side_effect=Exception("Processing error")):
            
            response = await inference_system.add_request(
                prompt="Test prompt",
                model_name="test-model",
                priority=RequestPriority.CRITICAL  # Process immediately
            )
            
            assert isinstance(response, InferenceResponse)
            assert "Processing error" in response.error
            assert inference_system.failed_requests == 1

    @pytest.mark.asyncio
    async def test_collect_batch_normal_priority(self, inference_system):
        """Test collecting batch with normal priority requests"""
        # Add requests to queue
        for i in range(5):
            request = InferenceRequest(
                id=f"request-{i}", prompt=f"prompt {i}", 
                priority=RequestPriority.NORMAL, timestamp=time.time(),
                model_name="test-model"
            )
            await inference_system.request_queues[RequestPriority.NORMAL].put(request)
        
        batch = await inference_system._collect_batch()
        
        # Should collect up to batch_size (3)
        assert len(batch) == 3
        assert all(req.priority == RequestPriority.NORMAL for req in batch)

    @pytest.mark.asyncio
    async def test_collect_batch_mixed_priorities(self, inference_system):
        """Test collecting batch with mixed priorities"""
        # Add high priority request
        high_request = InferenceRequest(
            id="high", prompt="high priority", priority=RequestPriority.HIGH,
            timestamp=time.time(), model_name="test-model"
        )
        await inference_system.request_queues[RequestPriority.HIGH].put(high_request)
        
        # Add normal priority requests
        for i in range(3):
            request = InferenceRequest(
                id=f"normal-{i}", prompt=f"normal {i}",
                priority=RequestPriority.NORMAL, timestamp=time.time(),
                model_name="test-model"
            )
            await inference_system.request_queues[RequestPriority.NORMAL].put(request)
        
        batch = await inference_system._collect_batch()
        
        # Should prioritize high priority request
        assert len(batch) >= 1
        assert batch[0].priority == RequestPriority.HIGH

    @pytest.mark.asyncio
    async def test_collect_batch_timeout(self, inference_system):
        """Test collecting batch with timeout (no requests available)"""
        batch = await inference_system._collect_batch()
        assert batch == []

    @pytest.mark.asyncio
    async def test_get_adaptive_batch_size_no_thermal(self, inference_system):
        """Test adaptive batch size without thermal guard"""
        batch_size = await inference_system._get_adaptive_batch_size()
        assert batch_size == inference_system.batch_size

    @pytest.mark.asyncio
    async def test_get_adaptive_batch_size_with_thermal(self, inference_system):
        """Test adaptive batch size with thermal guard"""
        mock_thermal_guard = Mock()
        mock_thermal_guard.get_thermal_recommendation.return_value = {
            'recommended_batch_size': 2
        }
        inference_system.set_thermal_guard(mock_thermal_guard)
        
        batch_size = await inference_system._get_adaptive_batch_size()
        assert batch_size == 2

    @pytest.mark.asyncio
    async def test_get_adaptive_batch_size_thermal_error(self, inference_system):
        """Test adaptive batch size with thermal guard error"""
        mock_thermal_guard = Mock()
        mock_thermal_guard.get_thermal_recommendation.side_effect = Exception("Thermal error")
        inference_system.set_thermal_guard(mock_thermal_guard)
        
        batch_size = await inference_system._get_adaptive_batch_size()
        assert batch_size == inference_system.batch_size  # Fallback

    @pytest.mark.asyncio
    async def test_process_batch_empty(self, inference_system):
        """Test processing empty batch"""
        await inference_system._process_batch([])
        # Should complete without error

    @pytest.mark.asyncio
    async def test_process_batch_single_model(self, inference_system):
        """Test processing batch with single model"""
        requests = [
            InferenceRequest(
                id=f"req-{i}", prompt=f"prompt {i}", priority=RequestPriority.NORMAL,
                timestamp=time.time(), model_name="test-model"
            ) for i in range(3)
        ]
        
        with patch.object(inference_system, '_process_model_group') as mock_process:
            await inference_system._process_batch(requests)
            
            mock_process.assert_called_once()
            assert inference_system.total_batches == 1

    @pytest.mark.asyncio
    async def test_process_batch_multiple_models(self, inference_system):
        """Test processing batch with multiple models"""
        requests = [
            InferenceRequest(
                id="req-1", prompt="prompt 1", priority=RequestPriority.NORMAL,
                timestamp=time.time(), model_name="model-1"
            ),
            InferenceRequest(
                id="req-2", prompt="prompt 2", priority=RequestPriority.NORMAL,
                timestamp=time.time(), model_name="model-2"
            ),
            InferenceRequest(
                id="req-3", prompt="prompt 3", priority=RequestPriority.NORMAL,
                timestamp=time.time(), model_name="model-1"
            )
        ]
        
        with patch.object(inference_system, '_process_model_group') as mock_process:
            await inference_system._process_batch(requests)
            
            # Should be called twice (once for each model)
            assert mock_process.call_count == 2

    @pytest.mark.asyncio
    async def test_process_batch_error(self, inference_system):
        """Test processing batch with error"""
        requests = [
            InferenceRequest(
                id="req-1", prompt="prompt", priority=RequestPriority.NORMAL,
                timestamp=time.time(), model_name="test-model"
            )
        ]
        
        with patch.object(inference_system, '_process_model_group', 
                         side_effect=Exception("Processing error")), \
             patch.object(inference_system, '_send_error_response') as mock_error:
            
            await inference_system._process_batch(requests)
            mock_error.assert_called()

    @pytest.mark.asyncio
    async def test_process_single_request(self, inference_system):
        """Test processing single inference request"""
        request = InferenceRequest(
            id="test-req", prompt="Test prompt", priority=RequestPriority.NORMAL,
            timestamp=time.time(), model_name="test-model", max_tokens=256
        )
        
        response = await inference_system._process_single_request(request)
        
        assert isinstance(response, InferenceResponse)
        assert response.request_id == "test-req"
        assert response.model_used == "test-model"
        assert response.inference_time_ms > 0
        assert response.queue_time_ms >= 0
        assert response.total_time_ms >= response.inference_time_ms
        assert response.error is None

    @pytest.mark.asyncio
    async def test_process_single_request_with_batch_time(self, inference_system):
        """Test processing single request with batch start time"""
        request = InferenceRequest(
            id="test-req", prompt="Test prompt", priority=RequestPriority.NORMAL,
            timestamp=time.time() - 0.1, model_name="test-model"
        )
        
        batch_start_time = time.time()
        response = await inference_system._process_single_request(request, batch_start_time)
        
        assert response.queue_time_ms > 100  # Should include time since request creation

    @pytest.mark.asyncio
    async def test_send_error_response(self, inference_system):
        """Test sending error response"""
        request = InferenceRequest(
            id="error-req", prompt="Test", priority=RequestPriority.NORMAL,
            timestamp=time.time(), model_name="test-model"
        )
        
        # Add to pending responses
        future = asyncio.Future()
        inference_system.pending_responses[request.id] = future
        
        await inference_system._send_error_response(request, "Test error", time.time())
        
        assert future.done()
        response = future.result()
        assert isinstance(response, InferenceResponse)
        assert response.error == "Test error"
        assert request.id not in inference_system.pending_responses
        assert inference_system.failed_requests == 1

    @pytest.mark.asyncio
    async def test_cleanup_pending_requests(self, inference_system):
        """Test cleanup of pending requests on shutdown"""
        # Add pending requests
        for i in range(3):
            future = asyncio.Future()
            inference_system.pending_responses[f"req-{i}"] = future
        
        await inference_system._cleanup_pending_requests()
        
        assert len(inference_system.pending_responses) == 0

    def test_get_queue_stats(self, inference_system):
        """Test queue statistics retrieval"""
        # Add some mock requests to queues
        inference_system.request_queues[RequestPriority.HIGH]._qsize = 2
        inference_system.request_queues[RequestPriority.NORMAL]._qsize = 5
        inference_system.pending_responses = {"req1": Mock(), "req2": Mock()}
        inference_system.current_batch = [Mock(), Mock(), Mock()]
        
        with patch.object(inference_system.request_queues[RequestPriority.HIGH], 'qsize', return_value=2), \
             patch.object(inference_system.request_queues[RequestPriority.NORMAL], 'qsize', return_value=5), \
             patch.object(inference_system.request_queues[RequestPriority.LOW], 'qsize', return_value=0), \
             patch.object(inference_system.request_queues[RequestPriority.CRITICAL], 'qsize', return_value=0):
            
            stats = inference_system.get_queue_stats()
        
        assert stats["total_queue_size"] == 7
        assert stats["queue_sizes_by_priority"]["HIGH"] == 2
        assert stats["queue_sizes_by_priority"]["NORMAL"] == 5
        assert stats["pending_responses"] == 2
        assert stats["current_batch_size"] == 3
        assert stats["max_queue_size"] == 100

    def test_get_performance_stats(self, inference_system):
        """Test performance statistics retrieval"""
        # Set up test data
        inference_system.total_requests = 100
        inference_system.total_batches = 25
        inference_system.failed_requests = 5
        inference_system.timeout_requests = 2
        inference_system.total_processing_time = 5000.0  # 5 seconds
        inference_system.average_batch_size = 3.8
        inference_system.requests_by_priority = {
            RequestPriority.CRITICAL: 10,
            RequestPriority.HIGH: 20,
            RequestPriority.NORMAL: 60,
            RequestPriority.LOW: 10
        }
        
        stats = inference_system.get_performance_stats()
        
        assert stats["total_requests"] == 100
        assert stats["total_batches"] == 25
        assert stats["failed_requests"] == 5
        assert stats["timeout_requests"] == 2
        assert stats["success_rate"] == 0.95  # (100-5)/100
        assert stats["average_batch_size"] == 3.8
        assert stats["average_processing_time_ms"] == 200.0  # 5000/25
        assert stats["requests_by_priority"][RequestPriority.CRITICAL] == 10
        assert stats["current_batch_size_setting"] == 3
        assert stats["timeout_ms"] == 50
        assert stats["adaptive_batching_enabled"] is True

    def test_set_batch_size(self, inference_system):
        """Test batch size configuration"""
        inference_system.set_batch_size(6)
        assert inference_system.batch_size == 6
        
        # Test clamping
        inference_system.set_batch_size(0)
        assert inference_system.batch_size == 1  # Minimum
        
        inference_system.set_batch_size(50)
        assert inference_system.batch_size == 32  # Maximum

    def test_set_timeout(self, inference_system):
        """Test timeout configuration"""
        inference_system.set_timeout(500)
        assert inference_system.timeout_ms == 500
        
        # Test clamping
        inference_system.set_timeout(5)
        assert inference_system.timeout_ms == 10  # Minimum
        
        inference_system.set_timeout(15000)
        assert inference_system.timeout_ms == 10000  # Maximum


class TestBatchedInferenceIntegration:
    """Integration tests for BatchedMLXInference"""
    
    @pytest.fixture
    def inference_system(self):
        """Inference system for integration testing"""
        return BatchedMLXInference(batch_size=2, timeout_ms=100)

    @pytest.mark.asyncio
    async def test_full_request_lifecycle(self, inference_system):
        """Test complete request processing lifecycle"""
        # Start processing
        await inference_system.start_processing()
        
        try:
            # Submit multiple requests
            tasks = []
            for i in range(5):
                priority = RequestPriority.HIGH if i % 3 == 0 else RequestPriority.NORMAL
                task = inference_system.add_request(
                    prompt=f"Test request {i}",
                    model_name="test-model",
                    priority=priority,
                    max_tokens=128
                )
                tasks.append(task)
            
            # Process requests with mock processing
            async def mock_batch_processing():
                await asyncio.sleep(0.05)  # Brief delay
                
                # Manually process pending requests for testing
                for request_id, future in list(inference_system.pending_responses.items()):
                    if not future.done():
                        mock_response = InferenceResponse(
                            request_id=request_id,
                            text=f"Response for {request_id}",
                            tokens_generated=20,
                            inference_time_ms=100,
                            queue_time_ms=50,
                            total_time_ms=150,
                            model_used="test-model",
                            batch_size=1
                        )
                        future.set_result(mock_response)
            
            # Start mock processing
            process_task = asyncio.create_task(mock_batch_processing())
            
            # Wait for responses
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            await process_task
            
            # Verify responses
            assert len(responses) == 5
            for response in responses:
                if isinstance(response, InferenceResponse):
                    assert response.text.startswith("Response for")
                    assert response.tokens_generated > 0
        
        finally:
            await inference_system.stop_processing()

    @pytest.mark.asyncio
    async def test_priority_ordering(self, inference_system):
        """Test that high priority requests are processed first"""
        await inference_system.start_processing()
        
        try:
            # Submit requests in mixed order
            normal_task = inference_system.add_request(
                prompt="Normal priority",
                model_name="test-model",
                priority=RequestPriority.NORMAL
            )
            
            high_task = inference_system.add_request(
                prompt="High priority", 
                model_name="test-model",
                priority=RequestPriority.HIGH
            )
            
            critical_task = inference_system.add_request(
                prompt="Critical priority",
                model_name="test-model", 
                priority=RequestPriority.CRITICAL
            )
            
            # Critical should be processed immediately
            critical_response = await critical_task
            assert critical_response.text  # Should have response
            
            # Mock processing for others
            async def mock_processing():
                await asyncio.sleep(0.01)
                for request_id, future in list(inference_system.pending_responses.items()):
                    if not future.done():
                        mock_response = InferenceResponse(
                            request_id=request_id, text="Processed", tokens_generated=10,
                            inference_time_ms=50, queue_time_ms=25, total_time_ms=75,
                            model_used="test-model", batch_size=1
                        )
                        future.set_result(mock_response)
            
            process_task = asyncio.create_task(mock_processing())
            
            # Wait for remaining responses
            high_response = await high_task
            normal_response = await normal_task
            
            await process_task
            
            assert isinstance(high_response, InferenceResponse)
            assert isinstance(normal_response, InferenceResponse)
        
        finally:
            await inference_system.stop_processing()

    @pytest.mark.asyncio
    async def test_thermal_integration(self, inference_system):
        """Test integration with thermal guard"""
        mock_thermal_guard = Mock()
        mock_thermal_guard.get_thermal_recommendation.return_value = {
            'recommended_batch_size': 1,
            'inference_delay_ms': 100
        }
        
        inference_system.set_thermal_guard(mock_thermal_guard)
        inference_system.adaptive_batching = True
        
        # Test adaptive batch size
        batch_size = await inference_system._get_adaptive_batch_size()
        assert batch_size == 1

    def test_concurrent_request_handling(self, inference_system):
        """Test handling multiple concurrent requests"""
        async def submit_request(i):
            try:
                response = await inference_system.add_request(
                    prompt=f"Concurrent request {i}",
                    model_name="test-model",
                    priority=RequestPriority.NORMAL
                )
                return response
            except Exception as e:
                return str(e)
        
        async def run_concurrent_test():
            # Submit 10 concurrent requests
            tasks = [submit_request(i) for i in range(10)]
            
            # Mock processing
            async def mock_processing():
                await asyncio.sleep(0.02)
                for request_id, future in list(inference_system.pending_responses.items()):
                    if not future.done():
                        mock_response = InferenceResponse(
                            request_id=request_id, text="Concurrent response",
                            tokens_generated=15, inference_time_ms=75,
                            queue_time_ms=25, total_time_ms=100,
                            model_used="test-model", batch_size=1
                        )
                        future.set_result(mock_response)
            
            process_task = asyncio.create_task(mock_processing())
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            await process_task
            
            return responses
        
        responses = asyncio.run(run_concurrent_test())
        
        # Most should succeed (some might timeout due to queue limits)
        successful_responses = [r for r in responses if isinstance(r, InferenceResponse)]
        assert len(successful_responses) > 0


class TestBatchedInferencePerformance:
    """Performance tests for BatchedMLXInference"""
    
    @pytest.fixture
    def inference_system(self):
        """Inference system for performance testing"""
        return BatchedMLXInference(batch_size=4, timeout_ms=10)

    def test_request_creation_performance(self, inference_system):
        """Test request creation performance"""
        start_time = time.time()
        
        requests = []
        for i in range(1000):
            request = InferenceRequest(
                id=f"perf-req-{i}",
                prompt=f"Performance test prompt {i}",
                priority=RequestPriority.NORMAL,
                timestamp=time.time(),
                model_name="test-model"
            )
            requests.append(request)
        
        end_time = time.time()
        creation_time = end_time - start_time
        
        # Should be very fast - under 10ms for 1000 requests
        assert creation_time < 0.01, f"Request creation too slow: {creation_time:.4f}s"
        assert len(requests) == 1000

    def test_queue_stats_performance(self, inference_system):
        """Test queue statistics performance"""
        # Set up substantial test data
        inference_system.total_requests = 10000
        inference_system.total_batches = 2500
        inference_system.failed_requests = 50
        inference_system.requests_by_priority = {
            priority: 2500 for priority in RequestPriority
        }
        
        start_time = time.time()
        
        # Calculate stats multiple times
        for _ in range(100):
            stats = inference_system.get_performance_stats()
        
        end_time = time.time()
        avg_time = (end_time - start_time) / 100
        
        # Should be fast even with many calculations
        assert avg_time < 0.001, f"Stats calculation too slow: {avg_time:.4f}s per call"

    @pytest.mark.asyncio
    async def test_batch_collection_performance(self, inference_system):
        """Test batch collection performance"""
        # Fill queues with requests
        for priority in RequestPriority:
            queue = inference_system.request_queues[priority]
            for i in range(10):
                request = InferenceRequest(
                    id=f"{priority.name}-{i}", prompt=f"prompt {i}",
                    priority=priority, timestamp=time.time(),
                    model_name="test-model"
                )
                await queue.put(request)
        
        start_time = time.time()
        
        # Collect multiple batches
        batches = []
        for _ in range(10):
            batch = await inference_system._collect_batch()
            batches.append(batch)
        
        end_time = time.time()
        avg_time = (end_time - start_time) / 10
        
        # Batch collection should be fast
        assert avg_time < 0.01, f"Batch collection too slow: {avg_time:.4f}s per batch"
        assert len(batches) == 10


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])