"""
A2A Orchestration Engine

Comprehensive Agent-to-Agent orchestration system with workflow management,
communication graph visualization, and intelligent agent selection.
"""

from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Set, Callable
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path

from rich.console import Console
from rich.table import Table
from rich.tree import Tree
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.live import Live

from ..core.config import CortexConfig


class AgentType(Enum):
    """Available agent types in the orchestration graph."""
    MLX_LOCAL = "mlx_local"
    CLAUDE_CODE = "claude_code"
    GEMINI_CLI = "gemini_cli"
    OLLAMA = "ollama"
    TABBY_COMPLETION = "tabby_completion"
    ROVO_INTEGRATION = "rovo_integration"
    PROJECT_INTELLIGENCE = "project_intelligence"
    CODE_GENERATOR = "code_generator"
    SECURITY_SCANNER = "security_scanner"


class AgentStatus(Enum):
    """Agent status in the orchestration graph."""
    IDLE = "idle"
    ACTIVE = "active"
    BUSY = "busy"
    ERROR = "error"
    OFFLINE = "offline"


class WorkflowStatus(Enum):
    """Workflow execution status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class AgentNode:
    """Agent node in the orchestration graph."""
    id: str
    agent_type: AgentType
    name: str
    description: str
    status: AgentStatus
    capabilities: List[str]
    dependencies: List[str]
    config: Dict[str, Any]
    last_used: datetime
    success_rate: float
    avg_response_time: float
    current_task: Optional[str] = None
    queue_size: int = 0


@dataclass
class WorkflowEdge:
    """Edge between agents in the orchestration graph."""
    id: str
    from_agent: str
    to_agent: str
    condition: str
    weight: float
    success_count: int
    failure_count: int
    last_used: datetime


@dataclass
class WorkflowTask:
    """Task in the orchestration workflow."""
    id: str
    name: str
    description: str
    agent_type: AgentType
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]]
    status: WorkflowStatus
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]
    retry_count: int
    max_retries: int
    timeout_seconds: int
    dependencies: List[str]
    priority: int


@dataclass
class WorkflowExecution:
    """Workflow execution context."""
    id: str
    name: str
    description: str
    tasks: List[WorkflowTask]
    status: WorkflowStatus
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    progress: float
    current_task: Optional[str]
    metadata: Dict[str, Any]


class A2AOrchestrationEngine:
    """Agent-to-Agent orchestration engine with workflow management."""

    def __init__(self, config: CortexConfig, console: Console | None = None):
        self.config = config
        self.console = console or Console()
        
        # Orchestration graph components
        self.agents: Dict[str, AgentNode] = {}
        self.edges: Dict[str, WorkflowEdge] = {}
        self.workflows: Dict[str, WorkflowExecution] = {}
        self.task_queue: List[WorkflowTask] = []
        
        # State management
        self.state_dir = config.config_dir / "orchestration"
        self.state_dir.mkdir(exist_ok=True)
        
        # Performance tracking
        self.performance_history: List[Dict[str, Any]] = []
        
        # Initialize default agents
        self._initialize_default_agents()
        self._load_orchestration_state()
    
    def _initialize_default_agents(self):
        """Initialize default agents in the orchestration graph."""
        default_agents = [
            AgentNode(
                id="mlx_local",
                agent_type=AgentType.MLX_LOCAL,
                name="MLX Local",
                description="Apple Silicon optimized local inference",
                status=AgentStatus.IDLE if self.config.mlx.enabled else AgentStatus.OFFLINE,
                capabilities=["text_generation", "code_completion", "local_inference", "fast_response"],
                dependencies=[],
                config={"enabled": self.config.mlx.enabled, "model_path": "mlx_models/"},
                last_used=datetime.now(),
                success_rate=0.95,
                avg_response_time=0.8
            ),
            AgentNode(
                id="claude_code",
                agent_type=AgentType.CLAUDE_CODE,
                name="Claude Code",
                description="Advanced code analysis and generation",
                status=AgentStatus.IDLE,
                capabilities=["code_analysis", "refactoring", "documentation", "debugging", "complex_reasoning"],
                dependencies=[],
                config={"api_endpoint": "claude-api", "model": "sonnet-3.5"},
                last_used=datetime.now(),
                success_rate=0.98,
                avg_response_time=1.2
            ),
            AgentNode(
                id="gemini_cli",
                agent_type=AgentType.GEMINI_CLI,
                name="Gemini CLI",
                description="Google Gemini integration for multimodal tasks",
                status=AgentStatus.IDLE if (self.config.config_dir / ".." / "ext" / "gemini-cli").exists() else AgentStatus.OFFLINE,
                capabilities=["multimodal_analysis", "image_processing", "document_analysis", "vision_tasks"],
                dependencies=[],
                config={"cli_path": "ext/gemini-cli/"},
                last_used=datetime.now(),
                success_rate=0.92,
                avg_response_time=1.5
            ),
            AgentNode(
                id="tabby_completion",
                agent_type=AgentType.TABBY_COMPLETION,
                name="Tabby Completion",
                description="Local code completion engine",
                status=AgentStatus.IDLE,
                capabilities=["code_completion", "syntax_analysis", "local_inference", "fast_completion"],
                dependencies=[],
                config={"endpoint": "http://localhost:8080", "model": "codellama"},
                last_used=datetime.now(),
                success_rate=0.89,
                avg_response_time=0.3
            ),
            AgentNode(
                id="rovo_integration",
                agent_type=AgentType.ROVO_INTEGRATION,
                name="Rovo Integration",
                description="Atlassian Rovo Dev CLI integration",
                status=AgentStatus.IDLE,
                capabilities=["jira_integration", "bitbucket_integration", "confluence_search", "project_management"],
                dependencies=[],
                config={"api_endpoint": "atlassian-api", "auth_method": "oauth"},
                last_used=datetime.now(),
                success_rate=0.94,
                avg_response_time=2.1
            ),
            AgentNode(
                id="project_intelligence",
                agent_type=AgentType.PROJECT_INTELLIGENCE,
                name="Project Intelligence",
                description="OWASP security scanning and SBOM generation",
                status=AgentStatus.IDLE,
                capabilities=["security_scanning", "dependency_analysis", "sbom_generation", "vulnerability_assessment"],
                dependencies=[],
                config={"owasp_enabled": True, "scan_depth": "deep"},
                last_used=datetime.now(),
                success_rate=0.91,
                avg_response_time=3.5
            ),
            AgentNode(
                id="code_generator",
                agent_type=AgentType.CODE_GENERATOR,
                name="Code Generator",
                description="Natural language to code generation",
                status=AgentStatus.IDLE,
                capabilities=["code_generation", "template_processing", "best_practices", "architecture_patterns"],
                dependencies=["claude_code", "mlx_local"],
                config={"templates_dir": "templates/", "style": "enterprise"},
                last_used=datetime.now(),
                success_rate=0.87,
                avg_response_time=2.8
            ),
            AgentNode(
                id="security_scanner",
                agent_type=AgentType.SECURITY_SCANNER,
                name="Security Scanner",
                description="Advanced security analysis and threat detection",
                status=AgentStatus.IDLE,
                capabilities=["threat_detection", "code_analysis", "compliance_checking", "risk_assessment"],
                dependencies=["project_intelligence"],
                config={"scan_types": ["sast", "dependency", "secrets"], "compliance": ["owasp", "cwe"]},
                last_used=datetime.now(),
                success_rate=0.93,
                avg_response_time=4.2
            )
        ]
        
        for agent in default_agents:
            self.agents[agent.id] = agent
        
        # Initialize default edges (agent communication paths)
        default_edges = [
            WorkflowEdge(
                id="claude_to_generator",
                from_agent="claude_code",
                to_agent="code_generator",
                condition="code_analysis_complete",
                weight=0.9,
                success_count=45,
                failure_count=2,
                last_used=datetime.now()
            ),
            WorkflowEdge(
                id="intelligence_to_rovo",
                from_agent="project_intelligence",
                to_agent="rovo_integration",
                condition="security_scan_complete",
                weight=0.8,
                success_count=23,
                failure_count=1,
                last_used=datetime.now()
            ),
            WorkflowEdge(
                id="tabby_to_claude",
                from_agent="tabby_completion",
                to_agent="claude_code",
                condition="completion_requires_analysis",
                weight=0.7,
                success_count=67,
                failure_count=5,
                last_used=datetime.now()
            ),
            WorkflowEdge(
                id="scanner_to_intelligence",
                from_agent="security_scanner",
                to_agent="project_intelligence",
                condition="security_analysis_complete",
                weight=0.85,
                success_count=34,
                failure_count=3,
                last_used=datetime.now()
            ),
            WorkflowEdge(
                id="generator_to_scanner",
                from_agent="code_generator",
                to_agent="security_scanner",
                condition="code_generation_complete",
                weight=0.75,
                success_count=28,
                failure_count=4,
                last_used=datetime.now()
            )
        ]
        
        for edge in default_edges:
            self.edges[edge.id] = edge
    
    def _load_orchestration_state(self):
        """Load orchestration state from disk."""
        state_file = self.state_dir / "orchestration_state.json"
        if state_file.exists():
            try:
                with open(state_file, 'r') as f:
                    state = json.load(f)
                
                # Update agent statistics
                for agent_id, agent_data in state.get("agents", {}).items():
                    if agent_id in self.agents:
                        agent = self.agents[agent_id]
                        agent.success_rate = agent_data.get("success_rate", agent.success_rate)
                        agent.avg_response_time = agent_data.get("avg_response_time", agent.avg_response_time)
                        agent.last_used = datetime.fromisoformat(agent_data.get("last_used", datetime.now().isoformat()))
                
                # Update edge statistics
                for edge_id, edge_data in state.get("edges", {}).items():
                    if edge_id in self.edges:
                        edge = self.edges[edge_id]
                        edge.success_count = edge_data.get("success_count", edge.success_count)
                        edge.failure_count = edge_data.get("failure_count", edge.failure_count)
                        edge.last_used = datetime.fromisoformat(edge_data.get("last_used", datetime.now().isoformat()))
                        
            except Exception as e:
                self.console.print(f"[yellow]Warning: Could not load orchestration state: {e}[/yellow]")
    
    def _save_orchestration_state(self):
        """Save orchestration state to disk."""
        state = {
            "agents": {
                agent_id: {
                    "success_rate": agent.success_rate,
                    "avg_response_time": agent.avg_response_time,
                    "last_used": agent.last_used.isoformat()
                }
                for agent_id, agent in self.agents.items()
            },
            "edges": {
                edge_id: {
                    "success_count": edge.success_count,
                    "failure_count": edge.failure_count,
                    "last_used": edge.last_used.isoformat()
                }
                for edge_id, edge in self.edges.items()
            },
            "last_updated": datetime.now().isoformat()
        }
        
        state_file = self.state_dir / "orchestration_state.json"
        with open(state_file, 'w') as f:
            json.dump(state, f, indent=2)

    def intelligent_agent_selection(self, task: str, requirements: Optional[Dict[str, Any]] = None) -> str:
        """Intelligent agent selection based on task analysis and requirements."""
        requirements = requirements or {}
        
        # Score agents based on multiple factors
        agent_scores = {}
        
        for agent_id, agent in self.agents.items():
            if agent.status == AgentStatus.OFFLINE:
                continue
            
            score = 0.0
            
            # Base score from success rate (40% weight)
            score += agent.success_rate * 40
            
            # Response time score (20% weight) - lower is better
            max_acceptable_time = 5.0
            time_score = max(0, 20 - (agent.avg_response_time / max_acceptable_time) * 20)
            score += time_score
            
            # Capability matching (25% weight)
            task_lower = task.lower()
            capability_matches = 0
            for capability in agent.capabilities:
                capability_words = capability.replace('_', ' ').split()
                for word in capability_words:
                    if word.lower() in task_lower:
                        capability_matches += 1
            
            capability_score = min(25, capability_matches * 3)
            score += capability_score
            
            # Current status bonus/penalty (10% weight)
            status_scores = {
                AgentStatus.IDLE: 10,
                AgentStatus.ACTIVE: 5,
                AgentStatus.BUSY: 0,
                AgentStatus.ERROR: -10
            }
            score += status_scores.get(agent.status, 0)
            
            # Queue size penalty (5% weight)
            score -= min(agent.queue_size * 1, 5)
            
            # Requirements matching bonuses
            if requirements.get("local_only") and "local" in [cap.lower() for cap in agent.capabilities]:
                score += 15
            if requirements.get("multimodal") and any("multimodal" in cap or "vision" in cap or "image" in cap for cap in agent.capabilities):
                score += 15
            if requirements.get("code_focus") and any("code" in cap for cap in agent.capabilities):
                score += 10
            if requirements.get("security_focus") and any("security" in cap or "scanning" in cap for cap in agent.capabilities):
                score += 12
            if requirements.get("fast_response") and agent.avg_response_time < 1.0:
                score += 8
            
            # Dependency availability check
            deps_available = all(
                dep_id in self.agents and self.agents[dep_id].status != AgentStatus.OFFLINE
                for dep_id in agent.dependencies
            )
            if not deps_available:
                score *= 0.7  # 30% penalty for unavailable dependencies
            
            agent_scores[agent_id] = score
        
        # Select best agent
        if agent_scores:
            best_agent = max(agent_scores, key=agent_scores.get)
            
            # Update agent last used time
            self.agents[best_agent].last_used = datetime.now()
            
            return best_agent
        
        # Fallback selection
        fallback_priority = ["claude_code", "mlx_local", "tabby_completion"]
        for agent_id in fallback_priority:
            if agent_id in self.agents and self.agents[agent_id].status != AgentStatus.OFFLINE:
                return agent_id
        
        return "claude_code"  # Ultimate fallback
    
    def create_workflow(self, name: str, description: str, tasks: List[Dict[str, Any]]) -> str:
        """Create a new workflow execution with intelligent task optimization."""
        workflow_id = str(uuid.uuid4())
        
        workflow_tasks = []
        for i, task_data in enumerate(tasks):
            # Intelligent agent type selection if not specified
            agent_type_str = task_data.get("agent_type")
            if not agent_type_str:
                # Select agent type based on task description
                task_desc = task_data.get("description", "").lower()
                if any(word in task_desc for word in ["security", "scan", "vulnerability"]):
                    agent_type_str = "security_scanner"
                elif any(word in task_desc for word in ["generate", "create", "code"]):
                    agent_type_str = "code_generator"
                elif any(word in task_desc for word in ["analyze", "review", "debug"]):
                    agent_type_str = "claude_code"
                elif any(word in task_desc for word in ["complete", "suggest"]):
                    agent_type_str = "tabby_completion"
                else:
                    agent_type_str = "claude_code"
            
            try:
                agent_type = AgentType(agent_type_str)
            except ValueError:
                agent_type = AgentType.CLAUDE_CODE
            
            task = WorkflowTask(
                id=str(uuid.uuid4()),
                name=task_data.get("name", f"Task {i+1}"),
                description=task_data.get("description", ""),
                agent_type=agent_type,
                input_data=task_data.get("input_data", {}),
                output_data=None,
                status=WorkflowStatus.PENDING,
                created_at=datetime.now(),
                started_at=None,
                completed_at=None,
                error_message=None,
                retry_count=0,
                max_retries=task_data.get("max_retries", 3),
                timeout_seconds=task_data.get("timeout_seconds", 300),
                dependencies=task_data.get("dependencies", []),
                priority=task_data.get("priority", 5)
            )
            workflow_tasks.append(task)
        
        # Sort tasks by priority and dependencies
        workflow_tasks.sort(key=lambda t: (-t.priority, len(t.dependencies)))
        
        workflow = WorkflowExecution(
            id=workflow_id,
            name=name,
            description=description,
            tasks=workflow_tasks,
            status=WorkflowStatus.PENDING,
            created_at=datetime.now(),
            started_at=None,
            completed_at=None,
            progress=0.0,
            current_task=None,
            metadata={
                "total_tasks": len(workflow_tasks),
                "estimated_duration": sum(self.agents[self.intelligent_agent_selection(t.description)].avg_response_time for t in workflow_tasks)
            }
        )
        
        self.workflows[workflow_id] = workflow
        return workflow_id
    
    async def execute_workflow(self, workflow_id: str) -> bool:
        """Execute a workflow with advanced orchestration and error handling."""
        if workflow_id not in self.workflows:
            return False
        
        workflow = self.workflows[workflow_id]
        workflow.status = WorkflowStatus.RUNNING
        workflow.started_at = datetime.now()
        
        try:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=self.console
            ) as progress:
                
                task_progress = progress.add_task("Executing workflow...", total=len(workflow.tasks))
                
                # Execute tasks with dependency resolution
                completed_tasks = set()
                failed_tasks = set()
                
                while len(completed_tasks) + len(failed_tasks) < len(workflow.tasks):
                    ready_tasks = [
                        task for task in workflow.tasks
                        if (task.id not in completed_tasks and 
                            task.id not in failed_tasks and
                            all(dep_id in completed_tasks for dep_id in task.dependencies))
                    ]
                    
                    if not ready_tasks:
                        # No more tasks can be executed
                        break
                    
                    # Execute ready tasks concurrently (up to 3 at a time)
                    batch_size = min(3, len(ready_tasks))
                    current_batch = ready_tasks[:batch_size]
                    
                    # Create tasks for concurrent execution
                    execution_tasks = []
                    for task in current_batch:
                        workflow.current_task = task.id
                        progress.update(task_progress, description=f"Executing: {task.name}")
                        
                        # Select best agent for this task
                        requirements = {
                            "code_focus": any(word in task.description.lower() for word in ["code", "programming", "development"]),
                            "security_focus": any(word in task.description.lower() for word in ["security", "vulnerability", "scan"]),
                            "fast_response": task.priority > 7,
                            "local_only": "local" in task.input_data.get("preferences", {})
                        }
                        
                        agent_id = self.intelligent_agent_selection(task.description, requirements)
                        agent = self.agents[agent_id]
                        
                        execution_tasks.append(self._execute_task(task, agent))
                    
                    # Wait for batch completion
                    batch_results = await asyncio.gather(*execution_tasks, return_exceptions=True)
                    
                    # Process results
                    for task, result in zip(current_batch, batch_results):
                        if isinstance(result, Exception):
                            task.status = WorkflowStatus.FAILED
                            task.error_message = str(result)
                            failed_tasks.add(task.id)
                        elif result:
                            task.status = WorkflowStatus.COMPLETED
                            task.completed_at = datetime.now()
                            completed_tasks.add(task.id)
                        else:
                            # Retry logic
                            if task.retry_count < task.max_retries:
                                task.retry_count += 1
                                task.status = WorkflowStatus.PENDING
                            else:
                                task.status = WorkflowStatus.FAILED
                                task.error_message = "Max retries exceeded"
                                failed_tasks.add(task.id)
                    
                    # Update progress
                    workflow.progress = len(completed_tasks) / len(workflow.tasks)
                    progress.update(task_progress, completed=len(completed_tasks))
                    
                    # Small delay for visualization
                    await asyncio.sleep(0.1)
            
            # Finalize workflow status
            if len(completed_tasks) == len(workflow.tasks):
                workflow.status = WorkflowStatus.COMPLETED
            else:
                workflow.status = WorkflowStatus.FAILED
            
            workflow.completed_at = datetime.now()
            workflow.current_task = None
            
            # Record performance metrics
            execution_time = (workflow.completed_at - workflow.started_at).total_seconds()
            self.performance_history.append({
                "workflow_id": workflow_id,
                "execution_time": execution_time,
                "success_rate": len(completed_tasks) / len(workflow.tasks),
                "timestamp": datetime.now().isoformat()
            })
            
            # Save state
            self._save_orchestration_state()
            
            return workflow.status == WorkflowStatus.COMPLETED
            
        except Exception as e:
            workflow.status = WorkflowStatus.FAILED
            workflow.completed_at = datetime.now()
            self.console.print(f"[red]Workflow execution failed: {e}[/red]")
            return False
    
    def _check_task_dependencies(self, task: WorkflowTask, workflow: WorkflowExecution) -> bool:
        """Check if task dependencies are satisfied."""
        if not task.dependencies:
            return True
        
        for dep_id in task.dependencies:
            dep_task = next((t for t in workflow.tasks if t.id == dep_id), None)
            if not dep_task or dep_task.status != WorkflowStatus.COMPLETED:
                return False
        
        return True
    
    async def _execute_task(self, task: WorkflowTask, agent: AgentNode) -> bool:
        """Execute a single task with the selected agent."""
        task.status = WorkflowStatus.RUNNING
        task.started_at = datetime.now()
        
        # Update agent status
        previous_status = agent.status
        agent.status = AgentStatus.BUSY
        agent.current_task = task.name
        agent.queue_size += 1
        
        try:
            # Simulate realistic execution time based on agent characteristics
            base_time = agent.avg_response_time
            complexity_factor = 1.0
            
            # Adjust for task complexity
            if "complex" in task.description.lower() or "advanced" in task.description.lower():
                complexity_factor = 1.5
            elif "simple" in task.description.lower() or "quick" in task.description.lower():
                complexity_factor = 0.7
            
            execution_time = base_time * complexity_factor
            await asyncio.sleep(min(execution_time, 3.0))  # Cap at 3 seconds for simulation
            
            # Simulate success based on agent success rate and task complexity
            import random
            success_probability = agent.success_rate * (1.0 - (complexity_factor - 1.0) * 0.1)
            success = random.random() < success_probability
            
            if success:
                # Generate realistic output data
                task.output_data = {
                    "result": f"Task '{task.name}' completed successfully by {agent.name}",
                    "agent_id": agent.id,
                    "execution_time": (datetime.now() - task.started_at).total_seconds(),
                    "complexity_factor": complexity_factor,
                    "agent_success_rate": agent.success_rate,
                    "task_metadata": {
                        "priority": task.priority,
                        "retry_count": task.retry_count,
                        "dependencies_count": len(task.dependencies)
                    }
                }
                
                # Update agent performance (positive)
                agent.success_rate = min(1.0, agent.success_rate + 0.005)
                
                # Update communication edges if applicable
                self._update_communication_edges(task, agent, True)
                
            else:
                task.error_message = f"Task execution failed in {agent.name} (simulated failure)"
                
                # Update agent performance (negative)
                agent.success_rate = max(0.0, agent.success_rate - 0.01)
                
                # Update communication edges if applicable
                self._update_communication_edges(task, agent, False)
            
            return success
            
        except Exception as e:
            task.error_message = str(e)
            agent.success_rate = max(0.0, agent.success_rate - 0.02)
            return False
        finally:
            # Reset agent status
            agent.status = previous_status if previous_status != AgentStatus.BUSY else AgentStatus.IDLE
            agent.current_task = None
            agent.queue_size = max(0, agent.queue_size - 1)
            agent.last_used = datetime.now()
            
            # Update average response time
            if task.started_at:
                actual_time = (datetime.now() - task.started_at).total_seconds()
                agent.avg_response_time = (agent.avg_response_time * 0.8) + (actual_time * 0.2)
    
    def _update_communication_edges(self, task: WorkflowTask, agent: AgentNode, success: bool):
        """Update communication edges based on task execution results."""
        # Find relevant edges involving this agent
        relevant_edges = [
            edge for edge in self.edges.values()
            if edge.from_agent == agent.id or edge.to_agent == agent.id
        ]
        
        for edge in relevant_edges:
            if success:
                edge.success_count += 1
            else:
                edge.failure_count += 1
            edge.last_used = datetime.now()
            
            # Update edge weight based on recent performance
            total_attempts = edge.success_count + edge.failure_count
            if total_attempts > 0:
                current_success_rate = edge.success_count / total_attempts
                # Smooth weight adjustment
                edge.weight = (edge.weight * 0.9) + (current_success_rate * 0.1)
    
    def visualize_orchestration_graph(self) -> None:
        """Display comprehensive orchestration graph visualization."""
        self.console.print("\n🛠️ [bold cyan]Agent-to-Agent Orchestration Graph[/bold cyan]\n")
        
        # System overview
        total_agents = len(self.agents)
        active_agents = len([a for a in self.agents.values() if a.status != AgentStatus.OFFLINE])
        avg_success_rate = sum(a.success_rate for a in self.agents.values()) / total_agents if total_agents > 0 else 0
        
        overview_panel = Panel.fit(
            f"**Total Agents**: {total_agents}\n"
            f"**Active Agents**: {active_agents}\n"
            f"**Average Success Rate**: {avg_success_rate:.1%}\n"
            f"**Active Workflows**: {len([w for w in self.workflows.values() if w.status == WorkflowStatus.RUNNING])}\n"
            f"**Communication Edges**: {len(self.edges)}",
            title="System Overview",
            border_style="blue"
        )
        self.console.print(overview_panel)
        
        # Agent status table with enhanced information
        agent_table = Table(title="Agent Status & Performance")
        agent_table.add_column("Agent ID", style="cyan")
        agent_table.add_column("Name", style="green")
        agent_table.add_column("Status", style="yellow")
        agent_table.add_column("Success Rate", style="blue")
        agent_table.add_column("Avg Response", style="magenta")
        agent_table.add_column("Capabilities", style="white")
        agent_table.add_column("Current Task", style="red")
        agent_table.add_column("Queue", style="orange1")
        
        for agent in sorted(self.agents.values(), key=lambda a: a.success_rate, reverse=True):
            status_emoji = {
                AgentStatus.IDLE: "🟢",
                AgentStatus.ACTIVE: "🟡",
                AgentStatus.BUSY: "🔴",
                AgentStatus.ERROR: "💥",
                AgentStatus.OFFLINE: "⚫"
            }
            
            agent_table.add_row(
                agent.id,
                agent.name,
                f"{status_emoji.get(agent.status, '❓')} {agent.status.value}",
                f"{agent.success_rate:.1%}",
                f"{agent.avg_response_time:.1f}s",
                f"{len(agent.capabilities)} caps",
                agent.current_task or "None",
                str(agent.queue_size)
            )
        
        self.console.print(agent_table)
        
        # Communication graph with performance metrics
        if self.edges:
            self.console.print("\n🔗 [bold]Agent Communication Graph[/bold]\n")
            
            edge_table = Table(title="Communication Edges & Performance")
            edge_table.add_column("From", style="cyan")
            edge_table.add_column("To", style="green")
            edge_table.add_column("Condition", style="yellow")
            edge_table.add_column("Success Rate", style="blue")
            edge_table.add_column("Weight", style="magenta")
            edge_table.add_column("Usage", style="white")
            edge_table.add_column("Last Used", style="dim")
            
            for edge in sorted(self.edges.values(), key=lambda e: e.weight, reverse=True):
                total_attempts = edge.success_count + edge.failure_count
                success_rate = (edge.success_count / total_attempts) if total_attempts > 0 else 0
                
                edge_table.add_row(
                    edge.from_agent,
                    edge.to_agent,
                    edge.condition,
                    f"{success_rate:.1%}",
                    f"{edge.weight:.2f}",
                    f"{total_attempts} uses",
                    edge.last_used.strftime("%H:%M:%S")
                )
            
            self.console.print(edge_table)
        
        # Active workflows with detailed progress
        active_workflows = {wf_id: wf for wf_id, wf in self.workflows.items() 
                           if wf.status in [WorkflowStatus.RUNNING, WorkflowStatus.PENDING]}
        
        if active_workflows:
            self.console.print("\n⚡ [bold]Active Workflows[/bold]\n")
            
            for wf_id, workflow in active_workflows.items():
                completed_tasks = sum(1 for t in workflow.tasks if t.status == WorkflowStatus.COMPLETED)
                failed_tasks = sum(1 for t in workflow.tasks if t.status == WorkflowStatus.FAILED)
                
                status_color = "green" if workflow.status == WorkflowStatus.RUNNING else "yellow"
                
                workflow_panel = Panel.fit(
                    f"**ID**: {wf_id[:8]}...\n"
                    f"**Name**: {workflow.name}\n"
                    f"**Status**: {workflow.status.value}\n"
                    f"**Progress**: {workflow.progress:.1%}\n"
                    f"**Tasks**: {completed_tasks}/{len(workflow.tasks)} completed\n"
                    f"**Failed**: {failed_tasks}\n"
                    f"**Current**: {workflow.current_task or 'None'}\n"
                    f"**Duration**: {(datetime.now() - workflow.created_at).total_seconds():.1f}s",
                    title=workflow.name,
                    border_style=status_color
                )
                self.console.print(workflow_panel)
        
        # Performance insights
        if self.performance_history:
            recent_performance = self.performance_history[-10:]  # Last 10 executions
            avg_execution_time = sum(p["execution_time"] for p in recent_performance) / len(recent_performance)
            avg_success_rate = sum(p["success_rate"] for p in recent_performance) / len(recent_performance)
            
            perf_panel = Panel.fit(
                f"**Recent Executions**: {len(recent_performance)}\n"
                f"**Avg Execution Time**: {avg_execution_time:.1f}s\n"
                f"**Avg Success Rate**: {avg_success_rate:.1%}\n"
                f"**Total Workflows**: {len(self.workflows)}",
                title="Performance Insights",
                border_style="green"
            )
            self.console.print(perf_panel)
    
    def get_workflow_status(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed workflow status with enhanced metrics."""
        if workflow_id not in self.workflows:
            return None
        
        workflow = self.workflows[workflow_id]
        completed_tasks = sum(1 for t in workflow.tasks if t.status == WorkflowStatus.COMPLETED)
        failed_tasks = sum(1 for t in workflow.tasks if t.status == WorkflowStatus.FAILED)
        
        duration = None
        if workflow.started_at:
            end_time = workflow.completed_at or datetime.now()
            duration = (end_time - workflow.started_at).total_seconds()
        
        return {
            "id": workflow.id,
            "name": workflow.name,
            "description": workflow.description,
            "status": workflow.status.value,
            "progress": workflow.progress,
            "tasks": {
                "total": len(workflow.tasks),
                "completed": completed_tasks,
                "failed": failed_tasks,
                "pending": len(workflow.tasks) - completed_tasks - failed_tasks
            },
            "current_task": workflow.current_task,
            "created_at": workflow.created_at.isoformat(),
            "started_at": workflow.started_at.isoformat() if workflow.started_at else None,
            "completed_at": workflow.completed_at.isoformat() if workflow.completed_at else None,
            "duration": duration,
            "estimated_duration": workflow.metadata.get("estimated_duration"),
            "metadata": workflow.metadata
        }
    
    def get_agent_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive agent performance report."""
        report = {
            "summary": {
                "total_agents": len(self.agents),
                "active_agents": len([a for a in self.agents.values() if a.status != AgentStatus.OFFLINE]),
                "avg_success_rate": sum(a.success_rate for a in self.agents.values()) / len(self.agents),
                "avg_response_time": sum(a.avg_response_time for a in self.agents.values()) / len(self.agents)
            },
            "agents": {},
            "communication": {
                "total_edges": len(self.edges),
                "active_edges": len([e for e in self.edges.values() if e.success_count + e.failure_count > 0])
            },
            "performance_trends": self.performance_history[-20:],  # Last 20 executions
            "recommendations": []
        }
        
        # Detailed agent metrics
        for agent_id, agent in self.agents.items():
            agent_metrics = {
                "name": agent.name,
                "type": agent.agent_type.value,
                "status": agent.status.value,
                "success_rate": agent.success_rate,
                "avg_response_time": agent.avg_response_time,
                "capabilities_count": len(agent.capabilities),
                "dependencies_count": len(agent.dependencies),
                "last_used": agent.last_used.isoformat(),
                "current_load": agent.queue_size,
                "performance_grade": self._calculate_performance_grade(agent)
            }
            report["agents"][agent_id] = agent_metrics
        
        # Generate recommendations
        report["recommendations"] = self._generate_performance_recommendations()
        
        return report
    
    def _calculate_performance_grade(self, agent: AgentNode) -> str:
        """Calculate performance grade for an agent."""
        score = 0
        
        # Success rate (40% weight)
        score += agent.success_rate * 40
        
        # Response time (30% weight) - lower is better
        max_acceptable_time = 5.0
        time_score = max(0, 30 - (agent.avg_response_time / max_acceptable_time) * 30)
        score += time_score
        
        # Status (20% weight)
        status_scores = {
            AgentStatus.IDLE: 20,
            AgentStatus.ACTIVE: 15,
            AgentStatus.BUSY: 10,
            AgentStatus.ERROR: 0,
            AgentStatus.OFFLINE: 0
        }
        score += status_scores.get(agent.status, 0)
        
        # Recent usage (10% weight)
        hours_since_last_use = (datetime.now() - agent.last_used).total_seconds() / 3600
        usage_score = max(0, 10 - hours_since_last_use)
        score += usage_score
        
        # Convert to letter grade
        if score >= 85:
            return "A"
        elif score >= 75:
            return "B"
        elif score >= 65:
            return "C"
        elif score >= 55:
            return "D"
        else:
            return "F"
    
    def _generate_performance_recommendations(self) -> List[str]:
        """Generate performance optimization recommendations."""
        recommendations = []
        
        # Analyze agent performance
        low_performers = [a for a in self.agents.values() if a.success_rate < 0.8]
        if low_performers:
            recommendations.append(f"Consider optimizing {len(low_performers)} agents with success rates below 80%")
        
        slow_agents = [a for a in self.agents.values() if a.avg_response_time > 3.0]
        if slow_agents:
            recommendations.append(f"Investigate {len(slow_agents)} agents with response times > 3.0s")
        
        # Analyze workflow patterns
        if self.performance_history:
            recent_avg_time = sum(p["execution_time"] for p in self.performance_history[-5:]) / min(5, len(self.performance_history))
            if recent_avg_time > 30.0:
                recommendations.append("Consider breaking down complex workflows into smaller tasks")
        
        # Communication analysis
        underused_edges = [e for e in self.edges.values() if e.success_count + e.failure_count < 5]
        if underused_edges:
            recommendations.append(f"Review {len(underused_edges)} underutilized communication paths")
        
        # Resource utilization
        busy_agents = [a for a in self.agents.values() if a.status == AgentStatus.BUSY]
        idle_agents = [a for a in self.agents.values() if a.status == AgentStatus.IDLE]
        
        if len(busy_agents) > len(idle_agents):
            recommendations.append("Consider load balancing - more agents are busy than idle")
        
        if not recommendations:
            recommendations.append("System is performing optimally - no immediate optimizations needed")
        
        return recommendations