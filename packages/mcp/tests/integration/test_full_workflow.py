"""Integration tests for complete MCP workflow scenarios."""

import asyncio
from typing import Any

import pytest

from mcp.core.protocol import MCPMessage, MessageType
from mcp.core.server import MCPServer
from mcp.integrations.a2a_bridge import A2ABridge, A2AEvent
from mcp.integrations.memory_bridge import MemoryBridge, MemoryType
from mcp.integrations.orchestration_bridge import OrchestrationBridge
from mcp.security.auth import MCPAuthenticator
from mcp.tasks.task_queue import TaskQueue


@pytest.mark.integration
class TestCompleteWorkflow:
    """Test complete end-to-end workflows."""

    @pytest.mark.asyncio
    async def test_tool_execution_with_memory_storage(
        self,
        mcp_server: MCPServer,
        memory_bridge: MemoryBridge,
        task_queue: TaskQueue,
    ):
        """Test tool execution that stores results in memory."""

        # Register a test tool that stores context
        @task_queue.registry.register("memory_tool")
        async def memory_tool(input_data: str, user_id: str) -> dict[str, Any]:
            result = {
                "processed_data": input_data.upper(),
                "timestamp": 12345,
                "success": True,
            }

            # Store in memory
            await memory_bridge.store_tool_context(
                tool_name="memory_tool",
                execution_id=f"exec_{12345}",
                context_data={
                    "input": input_data,
                    "result": result,
                },
                user_id=user_id,
            )

            return result

        # Execute via MCP protocol
        request = MCPMessage(
            type=MessageType.REQUEST,
            id="test-memory-1",
            method="tools/call",
            params={
                "name": "memory_tool",
                "parameters": {
                    "input_data": "test input",
                    "user_id": "test_user",
                },
            },
        )

        response = await mcp_server.handle_message(request)

        # Verify successful execution
        assert response.type == MessageType.RESPONSE
        assert response.result["success"] is True
        assert response.result["processed_data"] == "TEST INPUT"

        # Verify memory storage was called
        memory_bridge.store_tool_context.assert_called_once()

    @pytest.mark.asyncio
    async def test_a2a_event_triggering_tool_execution(
        self,
        a2a_bridge: A2ABridge,
        task_queue: TaskQueue,
    ):
        """Test A2A events triggering tool execution."""
        # Track tool execution
        tool_executed = asyncio.Event()
        execution_result = {}

        # Register test tool
        @task_queue.registry.register("a2a_triggered_tool")
        async def a2a_tool(message: str) -> dict[str, Any]:
            nonlocal execution_result
            execution_result = {
                "message": f"Processed: {message}",
                "triggered_by": "a2a_event",
            }
            tool_executed.set()
            return execution_result

        # Start task processing
        await task_queue.start_workers(1)

        # Publish A2A event that should trigger tool
        event = A2AEvent(
            event_type="tool.execute",
            payload={
                "tool_name": "a2a_triggered_tool",
                "parameters": {"message": "Hello from A2A"},
                "auth_token": "test_token",
            },
        )

        # Process event through handler
        result = await a2a_bridge.event_handler.handle_event(event)

        # Verify event was handled
        assert result["status"] == "handled"
        assert "task_id" in result["results"][0]

        # Wait for tool execution
        await asyncio.wait_for(tool_executed.wait(), timeout=5.0)

        # Verify tool was executed with correct parameters
        assert execution_result["message"] == "Processed: Hello from A2A"
        assert execution_result["triggered_by"] == "a2a_event"

    @pytest.mark.asyncio
    async def test_multi_step_orchestrated_workflow(
        self,
        task_queue: TaskQueue,
        a2a_bridge: A2ABridge,
        memory_bridge: MemoryBridge,
    ):
        """Test complex multi-step orchestrated workflow."""

        # Register workflow tools
        @task_queue.registry.register("data_processor")
        async def data_processor(data: str) -> dict[str, Any]:
            return {
                "processed": data.upper(),
                "length": len(data),
            }

        @task_queue.registry.register("data_validator")
        async def data_validator(
            processed_data: str, min_length: int
        ) -> dict[str, Any]:
            is_valid = len(processed_data) >= min_length
            return {
                "valid": is_valid,
                "data": processed_data,
                "validation_passed": is_valid,
            }

        @task_queue.registry.register("data_saver")
        async def data_saver(data: str, valid: bool, user_id: str) -> dict[str, Any]:
            if valid:
                # Simulate saving to memory
                await memory_bridge.store_tool_context(
                    tool_name="data_saver",
                    execution_id=f"save_{12345}",
                    context_data={"saved_data": data},
                    user_id=user_id,
                )
                return {"saved": True, "location": "memory_store"}
            return {"saved": False, "reason": "validation_failed"}

        # Create orchestration bridge
        orchestrator = OrchestrationBridge(task_queue, a2a_bridge, memory_bridge)

        # Define workflow
        workflow_id = await orchestrator.create_workflow(
            name="Data Processing Workflow",
            description="Process, validate, and save data",
            steps=[
                {
                    "step_id": "process",
                    "step_type": "tool_execution",
                    "config": {
                        "tool_name": "data_processor",
                        "parameters": {"data": "${input_data}"},
                    },
                    "dependencies": [],
                },
                {
                    "step_id": "validate",
                    "step_type": "tool_execution",
                    "config": {
                        "tool_name": "data_validator",
                        "parameters": {
                            "processed_data": "${step_process_result.processed}",
                            "min_length": 5,
                        },
                    },
                    "dependencies": ["process"],
                },
                {
                    "step_id": "save",
                    "step_type": "tool_execution",
                    "config": {
                        "tool_name": "data_saver",
                        "parameters": {
                            "data": "${step_validate_result.data}",
                            "valid": "${step_validate_result.valid}",
                            "user_id": "${user_id}",
                        },
                    },
                    "dependencies": ["validate"],
                },
            ],
            context={
                "input_data": "test workflow data",
                "user_id": "workflow_user",
            },
        )

        # Start workflow
        await orchestrator.start_workflow(workflow_id)

        # Wait for completion
        for _ in range(30):  # Max 30 seconds
            workflow = await orchestrator.get_workflow(workflow_id)
            if workflow.status.value in ["completed", "failed"]:
                break
            await asyncio.sleep(1)

        # Verify workflow completed successfully
        workflow = await orchestrator.get_workflow(workflow_id)
        assert workflow.status.value == "completed"
        assert workflow.progress == 100.0

        # Verify all steps completed
        for step in workflow.steps:
            assert step.status.value == "completed"

        # Verify context was properly passed between steps
        process_result = workflow.context["step_process_result"]
        assert process_result["processed"] == "TEST WORKFLOW DATA"
        assert process_result["length"] == 18

        validate_result = workflow.context["step_validate_result"]
        assert validate_result["valid"] is True
        assert validate_result["data"] == "TEST WORKFLOW DATA"

        save_result = workflow.context["step_save_result"]
        assert save_result["saved"] is True
        assert save_result["location"] == "memory_store"

    @pytest.mark.asyncio
    async def test_authenticated_tool_execution(
        self,
        mcp_server: MCPServer,
        authenticator: MCPAuthenticator,
        task_queue: TaskQueue,
    ):
        """Test tool execution with authentication."""
        # Create test user
        user_data = {
            "user_id": "auth_test_user",
            "username": "auth_test",
            "password": "test123",
            "permissions": ["tools:execute"],
        }

        user = await authenticator.user_store.create_user(user_data)

        # Create token
        tokens = await authenticator.create_tokens(user)

        # Register protected tool
        @task_queue.registry.register("protected_tool")
        async def protected_tool(
            data: str, auth_context: dict[str, Any]
        ) -> dict[str, Any]:
            user_id = auth_context.get("user_id")
            username = auth_context.get("username")

            return {
                "data": f"Protected processing of {data}",
                "user_id": user_id,
                "username": username,
                "authenticated": True,
            }

        # Execute tool with authentication
        request = MCPMessage(
            type=MessageType.REQUEST,
            id="auth-test-1",
            method="tools/call",
            params={
                "name": "protected_tool",
                "parameters": {
                    "data": "sensitive data",
                    "auth_context": {
                        "user_id": user.user_id,
                        "username": user.username,
                        "token": tokens.access_token,
                    },
                },
            },
        )

        response = await mcp_server.handle_message(request)

        # Verify successful authenticated execution
        assert response.type == MessageType.RESPONSE
        assert response.result["authenticated"] is True
        assert response.result["username"] == "auth_test"
        assert response.result["user_id"] == "auth_test_user"

    @pytest.mark.asyncio
    async def test_error_handling_and_recovery(
        self,
        mcp_server: MCPServer,
        task_queue: TaskQueue,
        error_simulator,
    ):
        """Test error handling and recovery mechanisms."""
        failure_count = 0

        # Register tool that fails initially then succeeds
        @task_queue.registry.register("flaky_tool")
        async def flaky_tool(data: str) -> dict[str, Any]:
            nonlocal failure_count
            failure_count += 1

            # Fail first two attempts
            if failure_count <= 2:
                raise RuntimeError(f"Simulated failure #{failure_count}")

            return {
                "data": f"Success after {failure_count - 1} failures",
                "attempts": failure_count,
            }

        # Execute tool (should fail initially)
        request = MCPMessage(
            type=MessageType.REQUEST,
            id="error-test-1",
            method="tools/call",
            params={
                "name": "flaky_tool",
                "parameters": {"data": "test"},
            },
        )

        response = await mcp_server.handle_message(request)

        # First attempt should fail
        assert response.type == MessageType.ERROR
        assert "Simulated failure #1" in response.error["message"]

        # Second attempt should also fail
        response2 = await mcp_server.handle_message(request)
        assert response2.type == MessageType.ERROR
        assert "Simulated failure #2" in response2.error["message"]

        # Third attempt should succeed
        response3 = await mcp_server.handle_message(request)
        assert response3.type == MessageType.RESPONSE
        assert response3.result["attempts"] == 3
        assert "Success after 2 failures" in response3.result["data"]

    @pytest.mark.asyncio
    async def test_concurrent_workflow_execution(
        self,
        task_queue: TaskQueue,
        a2a_bridge: A2ABridge,
        memory_bridge: MemoryBridge,
    ):
        """Test multiple workflows executing concurrently."""

        # Register simple processing tool
        @task_queue.registry.register("concurrent_processor")
        async def concurrent_processor(workflow_id: str, data: str) -> dict[str, Any]:
            await asyncio.sleep(0.1)  # Simulate processing time
            return {
                "workflow_id": workflow_id,
                "processed": f"PROCESSED_{data}",
                "timestamp": 12345,
            }

        orchestrator = OrchestrationBridge(task_queue, a2a_bridge, memory_bridge)

        # Create multiple workflows
        workflow_ids = []
        for i in range(5):
            workflow_id = await orchestrator.create_workflow(
                name=f"Concurrent Workflow {i}",
                description=f"Test workflow #{i}",
                steps=[
                    {
                        "step_id": "process",
                        "step_type": "tool_execution",
                        "config": {
                            "tool_name": "concurrent_processor",
                            "parameters": {
                                "workflow_id": f"workflow_{i}",
                                "data": f"data_{i}",
                            },
                        },
                        "dependencies": [],
                    },
                ],
            )
            workflow_ids.append(workflow_id)

        # Start all workflows concurrently
        start_tasks = [orchestrator.start_workflow(wf_id) for wf_id in workflow_ids]
        await asyncio.gather(*start_tasks)

        # Wait for all to complete
        completed_workflows = []
        for _ in range(30):  # Max 30 seconds
            for wf_id in workflow_ids:
                workflow = await orchestrator.get_workflow(wf_id)
                if workflow.status.value in ["completed", "failed"] and wf_id not in [
                    w.workflow_id for w in completed_workflows
                ]:
                    completed_workflows.append(workflow)

            if len(completed_workflows) == len(workflow_ids):
                break

            await asyncio.sleep(1)

        # Verify all workflows completed successfully
        assert len(completed_workflows) == 5

        for _, workflow in enumerate(completed_workflows):
            assert workflow.status.value == "completed"
            assert workflow.progress == 100.0

            # Verify workflow-specific results
            result = workflow.context["step_process_result"]
            assert result["workflow_id"] in [f"workflow_{j}" for j in range(5)]
            assert result["processed"].startswith("PROCESSED_data_")

    @pytest.mark.asyncio
    async def test_memory_context_retrieval(
        self,
        memory_bridge: MemoryBridge,
        task_queue: TaskQueue,
    ):
        """Test retrieving and using memory context in tools."""
        # Store some context first
        await memory_bridge.store_tool_context(
            tool_name="context_producer",
            execution_id="exec_001",
            context_data={
                "user_preference": "dark_mode",
                "language": "en",
                "session_data": {"theme": "dark", "notifications": True},
            },
            user_id="context_user",
        )

        await memory_bridge.store_conversation_context(
            session_id="session_123",
            user_id="context_user",
            message_content="I prefer dark themes and English language",
            message_role="user",
        )

        # Register tool that uses context
        @task_queue.registry.register("context_aware_tool")
        async def context_aware_tool(user_id: str, query: str) -> dict[str, Any]:
            # Retrieve similar contexts
            similar_contexts = await memory_bridge.retrieve_similar_contexts(
                query_text=query,
                user_id=user_id,
                limit=5,
            )

            preferences = {}
            for context in similar_contexts:
                if context.memory_type == MemoryType.TOOL_CONTEXT:
                    preferences.update(context.content.get("session_data", {}))

            return {
                "query": query,
                "user_preferences": preferences,
                "context_count": len(similar_contexts),
                "personalized": len(preferences) > 0,
            }

        # Execute context-aware tool
        result = await context_aware_tool("context_user", "show me settings")

        # Verify context was retrieved and used
        assert result["personalized"] is True
        assert result["context_count"] > 0
        assert "theme" in result["user_preferences"]
        assert result["user_preferences"]["theme"] == "dark"
