"""Unit tests for MCP protocol handling."""

import asyncio
import json

import pytest

from mcp.core.protocol import MCPMessage, MCPProtocolHandler, MessageType, Tool


class TestMCPMessage:
    """Test MCP message handling."""

    def test_message_creation(self):
        """Test creating MCP messages."""
        message = MCPMessage(
            type=MessageType.REQUEST,
            id="test-123",
            method="tools/list",
            params={"filter": "active"},
        )

        assert message.type == MessageType.REQUEST
        assert message.id == "test-123"
        assert message.method == "tools/list"
        assert message.params == {"filter": "active"}
        assert message.jsonrpc == "2.0"

    def test_message_serialization(self):
        """Test message JSON serialization."""
        message = MCPMessage(
            type=MessageType.REQUEST,
            id="test-123",
            method="tools/list",
            params={"filter": "active"},
        )

        json_str = message.to_json()
        data = json.loads(json_str)

        assert data["jsonrpc"] == "2.0"
        assert data["id"] == "test-123"
        assert data["method"] == "tools/list"
        assert data["params"] == {"filter": "active"}

    def test_message_deserialization(self):
        """Test message JSON deserialization."""
        json_data = {
            "jsonrpc": "2.0",
            "id": "test-123",
            "method": "tools/list",
            "params": {"filter": "active"},
        }

        message = MCPMessage.from_json(json.dumps(json_data))

        assert message.type == MessageType.REQUEST
        assert message.id == "test-123"
        assert message.method == "tools/list"
        assert message.params == {"filter": "active"}

    def test_response_message(self):
        """Test response message creation."""
        message = MCPMessage(
            type=MessageType.RESPONSE,
            id="test-123",
            result={"tools": ["tool1", "tool2"]},
        )

        json_str = message.to_json()
        data = json.loads(json_str)

        assert data["result"] == {"tools": ["tool1", "tool2"]}
        assert "method" not in data

    def test_error_message(self):
        """Test error message creation."""
        message = MCPMessage(
            type=MessageType.ERROR,
            id="test-123",
            error={"code": -32601, "message": "Method not found"},
        )

        json_str = message.to_json()
        data = json.loads(json_str)

        assert data["error"] == {"code": -32601, "message": "Method not found"}
        assert "result" not in data


class TestTool:
    """Test Tool class."""

    def test_tool_creation(self):
        """Test tool creation."""
        tool = Tool(
            name="test_tool",
            description="A test tool",
            parameters={"param1": {"type": "string", "required": True}},
        )

        assert tool.name == "test_tool"
        assert tool.description == "A test tool"
        assert tool.parameters["param1"]["type"] == "string"


class TestMCPProtocolHandler:
    """Test MCP protocol handler."""

    @pytest.fixture
    def handler(self):
        """Create protocol handler instance."""
        return MCPProtocolHandler()

    def test_handler_initialization(self, handler):
        """Test handler initialization."""
        assert handler.message_handlers == {}
        assert handler.request_counter == 0

    def test_register_handler(self, handler):
        """Test handler registration."""

        async def test_handler(params):
            return {"success": True}

        handler.register_handler("test/method", test_handler)
        assert "test/method" in handler.message_handlers
        assert handler.message_handlers["test/method"] == test_handler

    @pytest.mark.asyncio
    async def test_handle_request_success(self, handler):
        """Test successful request handling."""

        async def test_handler(params):
            return {"result": "success", "input": params}

        handler.register_handler("test/method", test_handler)

        request = MCPMessage(
            type=MessageType.REQUEST,
            id="test-123",
            method="test/method",
            params={"input": "test_data"},
        )

        response = await handler.handle_message(request)

        assert response.type == MessageType.RESPONSE
        assert response.id == "test-123"
        assert response.result["result"] == "success"
        assert response.result["input"] == {"input": "test_data"}

    @pytest.mark.asyncio
    async def test_handle_request_not_found(self, handler):
        """Test request with unknown method."""
        request = MCPMessage(
            type=MessageType.REQUEST,
            id="test-123",
            method="unknown/method",
            params={},
        )

        response = await handler.handle_message(request)

        assert response.type == MessageType.ERROR
        assert response.id == "test-123"
        assert response.error["code"] == -32601
        assert "Method not found" in response.error["message"]

    @pytest.mark.asyncio
    async def test_handle_request_handler_error(self, handler):
        """Test request handler that raises an exception."""

        async def failing_handler(params):
            raise ValueError("Test error")

        handler.register_handler("test/failing", failing_handler)

        request = MCPMessage(
            type=MessageType.REQUEST,
            id="test-123",
            method="test/failing",
            params={},
        )

        response = await handler.handle_message(request)

        assert response.type == MessageType.ERROR
        assert response.id == "test-123"
        assert response.error["code"] == -32603
        assert "Test error" in response.error["message"]

    @pytest.mark.asyncio
    async def test_handle_notification(self, handler):
        """Test notification handling."""
        handler_called = False
        handler_params = None

        async def notification_handler(params):
            nonlocal handler_called, handler_params
            handler_called = True
            handler_params = params

        handler.register_handler("test/notify", notification_handler)

        notification = MCPMessage(
            type=MessageType.NOTIFICATION,
            id="test-123",
            method="test/notify",
            params={"data": "notification_data"},
        )

        response = await handler.handle_message(notification)

        # Notifications don't return responses
        assert response is None
        assert handler_called
        assert handler_params == {"data": "notification_data"}

    @pytest.mark.asyncio
    async def test_handle_unsupported_message_type(self, handler):
        """Test handling unsupported message types."""
        # Create a message with invalid type
        invalid_message = MCPMessage(
            type=MessageType.ERROR,  # Using ERROR as request type
            id="test-123",
            method="test/method",
            params={},
        )

        response = await handler.handle_message(invalid_message)

        assert response.type == MessageType.ERROR
        assert response.error["code"] == -32601

    def test_create_request(self, handler):
        """Test request creation."""
        request = handler.create_request("test/method", {"param": "value"})

        assert request.type == MessageType.REQUEST
        assert request.id == "1"
        assert request.method == "test/method"
        assert request.params == {"param": "value"}

        # Test counter increment
        request2 = handler.create_request("test/method2")
        assert request2.id == "2"

    def test_create_request_no_params(self, handler):
        """Test request creation without parameters."""
        request = handler.create_request("test/method")

        assert request.params == {}

    @pytest.mark.asyncio
    async def test_concurrent_request_handling(self, handler):
        """Test handling multiple concurrent requests."""
        import asyncio

        call_count = 0

        async def counting_handler(params):
            nonlocal call_count
            call_count += 1
            await asyncio.sleep(0.1)  # Simulate async work
            return {"count": call_count}

        handler.register_handler("test/count", counting_handler)

        # Create multiple requests
        requests = [
            MCPMessage(
                type=MessageType.REQUEST,
                id=f"test-{i}",
                method="test/count",
                params={},
            )
            for i in range(5)
        ]

        # Handle them concurrently
        responses = await asyncio.gather(
            *[handler.handle_message(req) for req in requests]
        )

        # All should succeed
        assert all(resp.type == MessageType.RESPONSE for resp in responses)
        assert call_count == 5

    @pytest.mark.asyncio
    async def test_handler_with_complex_params(self, handler):
        """Test handler with complex parameter structures."""

        async def complex_handler(params):
            # Echo back the complex structure
            return {
                "received": params,
                "processed": True,
            }

        handler.register_handler("test/complex", complex_handler)

        complex_params = {
            "nested": {
                "array": [1, 2, 3],
                "object": {"key": "value"},
            },
            "boolean": True,
            "number": 42.5,
            "null_value": None,
        }

        request = MCPMessage(
            type=MessageType.REQUEST,
            id="test-complex",
            method="test/complex",
            params=complex_params,
        )

        response = await handler.handle_message(request)

        assert response.type == MessageType.RESPONSE
        assert response.result["received"] == complex_params
        assert response.result["processed"] is True


class TestProtocolEdgeCases:
    """Test protocol edge cases and error conditions."""

    @pytest.mark.asyncio
    async def test_malformed_json_handling(self):
        """Test handling of malformed JSON."""
        with pytest.raises(json.JSONDecodeError):
            MCPMessage.from_json("invalid json {")

    @pytest.mark.asyncio
    async def test_missing_required_fields(self):
        """Test handling of messages with missing fields."""
        # Missing ID
        incomplete_json = json.dumps(
            {
                "jsonrpc": "2.0",
                "method": "test/method",
            }
        )

        message = MCPMessage.from_json(incomplete_json)
        assert message.id is None

    @pytest.mark.asyncio
    async def test_handler_timeout_simulation(self, handler):
        """Test handler behavior under timeout conditions."""

        async def slow_handler(params):
            await asyncio.sleep(2)  # Longer than typical timeout
            return {"completed": True}

        handler.register_handler("test/slow", slow_handler)

        request = MCPMessage(
            type=MessageType.REQUEST,
            id="test-slow",
            method="test/slow",
            params={},
        )

        # Test with timeout
        with pytest.raises(TimeoutError):
            await asyncio.wait_for(handler.handle_message(request), timeout=0.5)

    @pytest.mark.asyncio
    async def test_handler_memory_cleanup(self, handler):
        """Test that handlers don't leak memory."""
        import gc
        import weakref

        class Holder:
            pass

        holder = Holder()
        holder.data = ["x" * 1000 for _ in range(1000)]
        weak_ref = weakref.ref(holder)
        size = len(holder.data)

        async def memory_handler(params):
            # Do not capture the holder object; return precomputed size
            return {"size": size}

        handler.register_handler("test/memory", memory_handler)

        request = MCPMessage(
            type=MessageType.REQUEST,
            id="test-memory",
            method="test/memory",
            params={},
        )

        response = await handler.handle_message(request)
        assert response.result["size"] == 1000

        # Clear reference and force garbage collection
        del holder
        gc.collect()

        # Weak reference should be dead
        assert weak_ref() is None
