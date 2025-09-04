"""Orchestration bridge for integrating MCP with Cortex-OS orchestration layer."""

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from ..tasks.task_queue import TaskPriority, TaskQueue
from .a2a_bridge import A2ABridge
from .memory_bridge import MemoryBridge

logger = logging.getLogger(__name__)


class WorkflowStatus(Enum):
    """Workflow execution status."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class StepStatus(Enum):
    """Individual step status."""

    WAITING = "waiting"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class WorkflowStep:
    """Individual step in a workflow."""

    step_id: str
    step_type: str  # "tool_execution", "condition", "loop", "parallel"
    config: dict[str, Any]
    dependencies: list[str] = field(default_factory=list)
    status: StepStatus = StepStatus.WAITING
    result: Any | None = None
    error: str | None = None
    started_at: float | None = None
    completed_at: float | None = None

    @property
    def execution_time(self) -> float | None:
        """Calculate execution time if completed."""
        if self.started_at and self.completed_at:
            return self.completed_at - self.started_at
        return None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "step_id": self.step_id,
            "step_type": self.step_type,
            "config": self.config,
            "dependencies": self.dependencies,
            "status": self.status.value,
            "result": self.result,
            "error": self.error,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "execution_time": self.execution_time,
        }


@dataclass
class Workflow:
    """Multi-step workflow definition and execution state."""

    workflow_id: str
    name: str
    description: str
    steps: list[WorkflowStep]
    status: WorkflowStatus = WorkflowStatus.PENDING
    context: dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    started_at: float | None = None
    completed_at: float | None = None
    created_by: str | None = None

    @property
    def execution_time(self) -> float | None:
        """Calculate total execution time."""
        if self.started_at and self.completed_at:
            return self.completed_at - self.started_at
        return None

    @property
    def progress(self) -> float:
        """Calculate workflow progress percentage."""
        if not self.steps:
            return 0.0

        completed_steps = sum(
            1
            for step in self.steps
            if step.status in [StepStatus.COMPLETED, StepStatus.SKIPPED]
        )
        return (completed_steps / len(self.steps)) * 100

    def get_step(self, step_id: str) -> WorkflowStep | None:
        """Get step by ID."""
        for step in self.steps:
            if step.step_id == step_id:
                return step
        return None

    def get_ready_steps(self) -> list[WorkflowStep]:
        """Get steps that are ready to execute."""
        ready_steps = []

        for step in self.steps:
            if step.status != StepStatus.WAITING:
                continue

            # Check if all dependencies are completed
            dependencies_met = all(
                self.get_step(dep_id).status == StepStatus.COMPLETED
                for dep_id in step.dependencies
                if self.get_step(dep_id) is not None
            )

            if dependencies_met:
                ready_steps.append(step)

        return ready_steps

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "workflow_id": self.workflow_id,
            "name": self.name,
            "description": self.description,
            "status": self.status.value,
            "progress": self.progress,
            "context": self.context,
            "steps": [step.to_dict() for step in self.steps],
            "created_at": self.created_at,
            "started_at": self.started_at,
            "completed_at": self.completed_at,
            "execution_time": self.execution_time,
            "created_by": self.created_by,
        }


class StepExecutor:
    """Executor for individual workflow steps."""

    def __init__(
        self,
        task_queue: TaskQueue,
        a2a_bridge: A2ABridge,
        memory_bridge: MemoryBridge,
    ):
        self.task_queue = task_queue
        self.a2a_bridge = a2a_bridge
        self.memory_bridge = memory_bridge

    async def execute_step(
        self,
        step: WorkflowStep,
        workflow_context: dict[str, Any],
    ) -> Any:
        """Execute a single workflow step."""
        step.status = StepStatus.RUNNING
        step.started_at = time.time()

        try:
            if step.step_type == "tool_execution":
                result = await self._execute_tool_step(step, workflow_context)
            elif step.step_type == "condition":
                result = await self._execute_condition_step(step, workflow_context)
            elif step.step_type == "loop":
                result = await self._execute_loop_step(step, workflow_context)
            elif step.step_type == "parallel":
                result = await self._execute_parallel_step(step, workflow_context)
            elif step.step_type == "a2a_event":
                result = await self._execute_a2a_step(step, workflow_context)
            elif step.step_type == "memory_operation":
                result = await self._execute_memory_step(step, workflow_context)
            else:
                raise ValueError(f"Unknown step type: {step.step_type}")

            step.status = StepStatus.COMPLETED
            step.result = result
            step.completed_at = time.time()

            return result

        except Exception as e:
            step.status = StepStatus.FAILED
            step.error = str(e)
            step.completed_at = time.time()
            logger.error(f"Step {step.step_id} failed: {e}")
            raise

    async def _execute_tool_step(
        self,
        step: WorkflowStep,
        workflow_context: dict[str, Any],
    ) -> Any:
        """Execute a tool execution step."""
        config = step.config
        tool_name = config.get("tool_name")
        parameters = config.get("parameters", {})

        # Substitute context variables in parameters
        resolved_parameters = self._resolve_context_variables(
            parameters, workflow_context
        )

        # Submit to task queue
        task_id = await self.task_queue.submit_task(
            "tool_execution",
            tool_name,
            resolved_parameters,
            priority=TaskPriority.HIGH,
        )

        # Wait for completion (with timeout)
        timeout = config.get("timeout", 300)  # 5 minutes default
        start_time = time.time()

        while time.time() - start_time < timeout:
            task_result = await self.task_queue.get_task_result(task_id)

            if task_result and task_result.status.value in ["completed", "failed"]:
                if task_result.status.value == "completed":
                    return task_result.result
                else:
                    raise RuntimeError(f"Tool execution failed: {task_result.error}")

            await asyncio.sleep(1)

        raise TimeoutError(f"Tool execution timed out after {timeout} seconds")

    async def _execute_condition_step(
        self,
        step: WorkflowStep,
        workflow_context: dict[str, Any],
    ) -> bool:
        """Execute a conditional step."""
        config = step.config
        condition = config.get("condition")

        if not condition:
            return True

        # Simple condition evaluation (extend as needed)
        if isinstance(condition, dict):
            operator = condition.get("operator")
            left = self._resolve_context_variables(
                condition.get("left"), workflow_context
            )
            right = self._resolve_context_variables(
                condition.get("right"), workflow_context
            )

            if operator == "equals":
                return left == right
            elif operator == "not_equals":
                return left != right
            elif operator == "greater_than":
                return left > right
            elif operator == "less_than":
                return left < right
            elif operator == "contains":
                return right in left
            else:
                raise ValueError(f"Unknown condition operator: {operator}")

        return bool(condition)

    async def _execute_loop_step(
        self,
        step: WorkflowStep,
        workflow_context: dict[str, Any],
    ) -> list[Any]:
        """Execute a loop step."""
        config = step.config
        items = self._resolve_context_variables(
            config.get("items", []), workflow_context
        )
        sub_steps = config.get("steps", [])

        results = []

        for i, item in enumerate(items):
            # Create sub-context with current item
            sub_context = workflow_context.copy()
            sub_context["current_item"] = item
            sub_context["current_index"] = i

            # Execute sub-steps
            for sub_step_config in sub_steps:
                sub_step = WorkflowStep(
                    step_id=f"{step.step_id}_loop_{i}_{sub_step_config['step_id']}",
                    step_type=sub_step_config["step_type"],
                    config=sub_step_config,
                )

                sub_result = await self.execute_step(sub_step, sub_context)
                results.append(sub_result)

        return results

    async def _execute_parallel_step(
        self,
        step: WorkflowStep,
        workflow_context: dict[str, Any],
    ) -> list[Any]:
        """Execute parallel sub-steps."""
        config = step.config
        sub_steps_configs = config.get("steps", [])

        # Create sub-steps
        sub_steps = []
        for sub_step_config in sub_steps_configs:
            sub_step = WorkflowStep(
                step_id=f"{step.step_id}_parallel_{sub_step_config['step_id']}",
                step_type=sub_step_config["step_type"],
                config=sub_step_config,
            )
            sub_steps.append(sub_step)

        # Execute in parallel
        tasks = [
            self.execute_step(sub_step, workflow_context) for sub_step in sub_steps
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Check for exceptions
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                raise RuntimeError(f"Parallel step {i} failed: {result}")

        return results

    async def _execute_a2a_step(
        self,
        step: WorkflowStep,
        workflow_context: dict[str, Any],
    ) -> Any:
        """Execute A2A event step."""
        config = step.config
        event_type = config.get("event_type")
        payload = self._resolve_context_variables(
            config.get("payload", {}), workflow_context
        )
        target_agents = config.get("target_agents")

        # Publish A2A event
        correlation_id = await self.a2a_bridge.publish_event(
            event_type=event_type,
            payload=payload,
            target_agents=target_agents,
        )

        # If expecting response, wait for it
        if config.get("wait_for_response", False):
            # Implementation would wait for response via correlation_id
            # For now, return the correlation_id
            return {"correlation_id": correlation_id, "status": "published"}

        return {"correlation_id": correlation_id, "status": "published"}

    async def _execute_memory_step(
        self,
        step: WorkflowStep,
        workflow_context: dict[str, Any],
    ) -> Any:
        """Execute memory operation step."""
        config = step.config
        operation = config.get("operation")  # "store", "retrieve", "search"

        if operation == "store":
            context_data = self._resolve_context_variables(
                config.get("data", {}), workflow_context
            )
            memory_id = await self.memory_bridge.store_tool_context(
                tool_name=config.get("tool_name", "workflow_step"),
                execution_id=step.step_id,
                context_data=context_data,
                user_id=workflow_context.get("user_id"),
            )
            return {"memory_id": memory_id}

        elif operation == "retrieve":
            query_text = self._resolve_context_variables(
                config.get("query", ""), workflow_context
            )
            memories = await self.memory_bridge.retrieve_similar_contexts(
                query_text=query_text,
                limit=config.get("limit", 5),
                user_id=workflow_context.get("user_id"),
            )
            return [memory.to_dict() for memory in memories]

        else:
            raise ValueError(f"Unknown memory operation: {operation}")

    def _resolve_context_variables(self, value: Any, context: dict[str, Any]) -> Any:
        """Resolve context variables in configuration values."""
        if isinstance(value, str) and value.startswith("${") and value.endswith("}"):
            # Extract variable name
            var_name = value[2:-1]
            return context.get(var_name, value)

        elif isinstance(value, dict):
            return {
                key: self._resolve_context_variables(val, context)
                for key, val in value.items()
            }

        elif isinstance(value, list):
            return [self._resolve_context_variables(item, context) for item in value]

        return value


class OrchestrationBridge:
    """Bridge for orchestrating complex multi-step workflows in MCP."""

    def __init__(
        self,
        task_queue: TaskQueue,
        a2a_bridge: A2ABridge,
        memory_bridge: MemoryBridge,
    ):
        self.task_queue = task_queue
        self.a2a_bridge = a2a_bridge
        self.memory_bridge = memory_bridge
        self.step_executor = StepExecutor(task_queue, a2a_bridge, memory_bridge)

        # Workflow storage
        self.workflows: dict[str, Workflow] = {}
        self.running_workflows: dict[str, asyncio.Task] = {}

        # Metrics
        self.workflows_created = 0
        self.workflows_completed = 0
        self.workflows_failed = 0

    async def create_workflow(
        self,
        name: str,
        description: str,
        steps: list[dict[str, Any]],
        context: dict[str, Any] | None = None,
        created_by: str | None = None,
    ) -> str:
        """Create a new workflow."""
        workflow_id = str(uuid.uuid4())

        # Convert step configs to WorkflowStep objects
        workflow_steps = []
        for step_config in steps:
            step = WorkflowStep(
                step_id=step_config["step_id"],
                step_type=step_config["step_type"],
                config=step_config.get("config", {}),
                dependencies=step_config.get("dependencies", []),
            )
            workflow_steps.append(step)

        workflow = Workflow(
            workflow_id=workflow_id,
            name=name,
            description=description,
            steps=workflow_steps,
            context=context or {},
            created_by=created_by,
        )

        self.workflows[workflow_id] = workflow
        self.workflows_created += 1

        # Store workflow in memory for persistence
        await self.memory_bridge.store_tool_context(
            tool_name="workflow_orchestration",
            execution_id=workflow_id,
            context_data={
                "workflow_definition": workflow.to_dict(),
                "created_by": created_by,
            },
            user_id=created_by,
        )

        logger.info(f"Created workflow {workflow_id}: {name}")
        return workflow_id

    async def start_workflow(self, workflow_id: str) -> None:
        """Start executing a workflow."""
        workflow = self.workflows.get(workflow_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        if workflow.status != WorkflowStatus.PENDING:
            raise ValueError(f"Workflow {workflow_id} is not in pending state")

        workflow.status = WorkflowStatus.RUNNING
        workflow.started_at = time.time()

        # Start execution task
        execution_task = asyncio.create_task(self._execute_workflow(workflow))
        self.running_workflows[workflow_id] = execution_task

        logger.info(f"Started workflow {workflow_id}")

    async def _execute_workflow(self, workflow: Workflow) -> None:
        """Execute a workflow asynchronously."""
        try:
            while True:
                ready_steps = workflow.get_ready_steps()

                if not ready_steps:
                    # Check if workflow is complete
                    all_completed = all(
                        step.status in [StepStatus.COMPLETED, StepStatus.SKIPPED]
                        for step in workflow.steps
                    )

                    if all_completed:
                        workflow.status = WorkflowStatus.COMPLETED
                        workflow.completed_at = time.time()
                        self.workflows_completed += 1
                        break

                    # Check for failed steps that would block progress
                    failed_steps = [
                        step
                        for step in workflow.steps
                        if step.status == StepStatus.FAILED
                    ]
                    if failed_steps:
                        workflow.status = WorkflowStatus.FAILED
                        workflow.completed_at = time.time()
                        self.workflows_failed += 1
                        break

                    # Wait a bit and check again
                    await asyncio.sleep(1)
                    continue

                # Execute ready steps in parallel
                step_tasks = []
                for step in ready_steps:
                    task = asyncio.create_task(
                        self.step_executor.execute_step(step, workflow.context)
                    )
                    step_tasks.append((step, task))

                # Wait for all steps to complete
                for step, task in step_tasks:
                    try:
                        result = await task
                        # Update workflow context with step result
                        workflow.context[f"step_{step.step_id}_result"] = result

                    except Exception as e:
                        logger.error(
                            f"Step {step.step_id} in workflow {workflow.workflow_id} failed: {e}"
                        )
                        # Step status is already set to failed in step_executor

            # Update workflow in memory
            await self._update_workflow_in_memory(workflow)

        except Exception as e:
            workflow.status = WorkflowStatus.FAILED
            workflow.completed_at = time.time()
            self.workflows_failed += 1
            logger.error(f"Workflow {workflow.workflow_id} execution failed: {e}")

        finally:
            # Clean up running workflow reference
            self.running_workflows.pop(workflow.workflow_id, None)

    async def _update_workflow_in_memory(self, workflow: Workflow) -> None:
        """Update workflow state in memory."""
        await self.memory_bridge.store_tool_context(
            tool_name="workflow_orchestration",
            execution_id=f"{workflow.workflow_id}_state",
            context_data={
                "workflow_state": workflow.to_dict(),
                "updated_at": time.time(),
            },
            user_id=workflow.created_by,
        )

    async def pause_workflow(self, workflow_id: str) -> None:
        """Pause a running workflow."""
        workflow = self.workflows.get(workflow_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        if workflow.status != WorkflowStatus.RUNNING:
            raise ValueError(f"Workflow {workflow_id} is not running")

        workflow.status = WorkflowStatus.PAUSED

        # Cancel execution task
        execution_task = self.running_workflows.get(workflow_id)
        if execution_task:
            execution_task.cancel()
            self.running_workflows.pop(workflow_id, None)

        logger.info(f"Paused workflow {workflow_id}")

    async def cancel_workflow(self, workflow_id: str) -> None:
        """Cancel a workflow."""
        workflow = self.workflows.get(workflow_id)
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")

        workflow.status = WorkflowStatus.CANCELLED
        workflow.completed_at = time.time()

        # Cancel execution task
        execution_task = self.running_workflows.get(workflow_id)
        if execution_task:
            execution_task.cancel()
            self.running_workflows.pop(workflow_id, None)

        logger.info(f"Cancelled workflow {workflow_id}")

    async def get_workflow(self, workflow_id: str) -> Workflow | None:
        """Get workflow by ID."""
        return self.workflows.get(workflow_id)

    async def list_workflows(
        self,
        status_filter: WorkflowStatus | None = None,
        created_by: str | None = None,
        limit: int = 50,
    ) -> list[Workflow]:
        """List workflows with optional filtering."""
        workflows = list(self.workflows.values())

        if status_filter:
            workflows = [w for w in workflows if w.status == status_filter]

        if created_by:
            workflows = [w for w in workflows if w.created_by == created_by]

        # Sort by created time (newest first)
        workflows.sort(key=lambda w: w.created_at, reverse=True)

        return workflows[:limit]

    async def get_workflow_metrics(self) -> dict[str, Any]:
        """Get orchestration metrics."""
        active_workflows = len(self.running_workflows)
        total_workflows = len(self.workflows)

        status_counts = {}
        for status in WorkflowStatus:
            status_counts[status.value] = sum(
                1 for w in self.workflows.values() if w.status == status
            )

        return {
            "total_workflows": total_workflows,
            "active_workflows": active_workflows,
            "workflows_created": self.workflows_created,
            "workflows_completed": self.workflows_completed,
            "workflows_failed": self.workflows_failed,
            "status_distribution": status_counts,
            "success_rate": (
                self.workflows_completed
                / max(1, self.workflows_completed + self.workflows_failed)
            ),
        }

    async def health_check(self) -> dict[str, Any]:
        """Perform health check on orchestration system."""
        return {
            "status": "healthy",
            "active_workflows": len(self.running_workflows),
            "total_workflows": len(self.workflows),
            "task_queue_healthy": self.task_queue.running,
            "a2a_bridge_healthy": self.a2a_bridge.running,
            "memory_bridge_healthy": True,  # Add proper health check
        }
