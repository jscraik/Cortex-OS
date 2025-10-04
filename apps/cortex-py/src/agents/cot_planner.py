"""
Chain-of-Thought (CoT) Planner for Cortex-Py (Phase 4.1)

Decomposes complex tasks into sequential steps with reasoning traces.

Following CODESTYLE.md:
- snake_case naming
- Type hints on all public functions
- Guard clauses for readability
- Functions ≤40 lines
- brAInwav branding in outputs
"""

import json
from datetime import datetime, timezone
from typing import List, Dict, Any
from src.multimodal.types import Memory, Modality


class PlanningError(Exception):
    """brAInwav planning error"""

    pass


class CoTPlanner:
    """
    Chain-of-Thought planner for task decomposition.
    
    Generates linear reasoning chains for goal achievement.
    Stores reasoning traces in multimodal memory system.
    """

    def __init__(self, max_steps: int = 10):
        """
        Initialize CoT planner.
        
        Args:
            max_steps: Maximum number of steps to generate
        """
        self.max_steps = max_steps

    def generate_plan(
        self, goal: str, context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate Chain-of-Thought plan for a goal.
        
        Args:
            goal: High-level goal to achieve
            context: Additional context for planning
        
        Returns:
            Plan dictionary with steps and reasoning
        
        Following CODESTYLE.md: Guard clauses for validation
        """
        # Guard: empty goal
        if not goal or not goal.strip():
            raise PlanningError("brAInwav: Goal cannot be empty")

        # Assess complexity
        complexity = self._assess_complexity(goal, context)

        # Generate steps based on complexity
        steps = self._generate_steps(goal, context, complexity)

        # Generate reasoning trace
        reasoning = self._generate_reasoning(goal, steps)

        # Create plan structure
        plan = {
            "id": f"plan-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            "strategy": "cot",
            "goal": goal,
            "steps": steps,
            "reasoning": reasoning,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "complexity": complexity,
            "brAInwav_metadata": {
                "created_by": "brAInwav CoT Planner",
                "version": "1.0.0",
            },
        }

        return plan

    def _assess_complexity(
        self, goal: str, context: Dict[str, Any]
    ) -> int:
        """
        Assess task complexity on 1-10 scale.
        
        Following CODESTYLE.md: Guard clauses for simple cases
        """
        # Guard: simple keyword indicators
        simple_keywords = ["fix", "typo", "update", "change"]
        if any(kw in goal.lower() for kw in simple_keywords):
            return 2

        complex_keywords = ["implement", "distributed", "microservices", "architecture"]
        if any(kw in goal.lower() for kw in complex_keywords):
            return 8

        # Check context for complexity hints
        if "microservices" in context:
            return 8

        # Default medium complexity
        return 5

    def _generate_steps(
        self, goal: str, context: Dict[str, Any], complexity: int
    ) -> List[Dict[str, Any]]:
        """
        Generate plan steps based on complexity.
        
        Following CODESTYLE.md: Guard clauses for simple cases
        """
        # Guard: simple tasks get fewer steps
        if complexity <= 3:
            return [
                {
                    "id": "step1",
                    "description": f"Analyze: {goal}",
                    "dependencies": [],
                },
                {
                    "id": "step2",
                    "description": f"Implement: {goal}",
                    "dependencies": ["step1"],
                },
                {
                    "id": "step3",
                    "description": f"Verify: {goal}",
                    "dependencies": ["step2"],
                },
            ]

        # Complex tasks get more detailed steps
        steps = [
            {
                "id": "step1",
                "description": f"Research: {goal}",
                "dependencies": [],
            },
            {
                "id": "step2",
                "description": "Analyze current implementation",
                "dependencies": ["step1"],
            },
            {
                "id": "step3",
                "description": "Design solution architecture",
                "dependencies": ["step2"],
            },
            {
                "id": "step4",
                "description": "Implement core functionality",
                "dependencies": ["step3"],
            },
            {
                "id": "step5",
                "description": "Write comprehensive tests",
                "dependencies": ["step4"],
            },
            {
                "id": "step6",
                "description": "Deploy and monitor",
                "dependencies": ["step5"],
            },
        ]

        return steps[:min(len(steps), self.max_steps)]

    def _generate_reasoning(
        self, goal: str, steps: List[Dict[str, Any]]
    ) -> str:
        """
        Generate reasoning trace explaining the plan.
        
        Following CODESTYLE.md: Simple string composition
        """
        reasoning_parts = [
            f"brAInwav Chain-of-Thought Planning for: {goal}",
            f"\nGenerated {len(steps)} sequential steps:",
        ]

        for i, step in enumerate(steps, 1):
            deps = (
                f" (depends on: {', '.join(step['dependencies'])})"
                if step["dependencies"]
                else ""
            )
            reasoning_parts.append(f"\n{i}. {step['description']}{deps}")

        reasoning_parts.append(
            "\n\nbrAInwav: This plan follows a linear execution path "
            "with clear dependencies between steps."
        )

        return "".join(reasoning_parts)

    def plan_to_memory(self, plan: Dict[str, Any]) -> Memory:
        """
        Convert plan to Memory format for storage.
        
        Args:
            plan: Plan dictionary
        
        Returns:
            Memory object with plan data
        
        Following CODESTYLE.md: Guard clauses
        """
        # Guard: plan must have required fields
        if "id" not in plan or "goal" not in plan:
            raise PlanningError("brAInwav: Invalid plan structure")

        # Create memory entry
        memory: Memory = {
            "id": plan["id"],
            "kind": "artifact",
            "modality": Modality.TEXT,
            "text": json.dumps(plan, indent=2),
            "tags": ["planning", "reasoning", "cot", plan["strategy"]],
            "createdAt": plan.get(
                "created_at", datetime.now(timezone.utc).isoformat()
            ),
            "updatedAt": plan.get(
                "created_at", datetime.now(timezone.utc).isoformat()
            ),
            "provenance": {"source": "agent", "actor": "cot-planner"},
            "metadata": {
                "goal": plan["goal"],
                "complexity": plan.get("complexity", 5),
                "step_count": len(plan.get("steps", [])),
                "brAInwav": True,
            },
        }

        return memory

    def memory_to_plan(self, memory: Memory) -> Dict[str, Any]:
        """
        Reconstruct plan from Memory format.
        
        Args:
            memory: Memory object containing plan
        
        Returns:
            Reconstructed plan dictionary
        
        Following CODESTYLE.md: Guard clauses
        """
        # Guard: memory must have text
        if not memory.get("text"):
            raise PlanningError("brAInwav: Memory has no text content")

        try:
            plan = json.loads(memory["text"])
            return plan
        except json.JSONDecodeError as e:
            raise PlanningError(
                f"brAInwav: Failed to parse plan from memory - {e}"
            ) from e


def validate_plan(plan: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate plan structure and detect issues.
    
    Args:
        plan: Plan dictionary to validate
    
    Returns:
        Validation result with issues list
    
    Following CODESTYLE.md: Guard clauses for validation
    """
    issues: List[str] = []

    # Check required fields
    if "id" not in plan:
        issues.append("brAInwav: Missing plan ID")

    if "steps" not in plan:
        issues.append("brAInwav: Missing steps")
        return {"valid": False, "issues": issues}

    # Check for circular dependencies
    steps = plan["steps"]
    step_ids = {step["id"] for step in steps}

    for step in steps:
        for dep_id in step.get("dependencies", []):
            if dep_id not in step_ids:
                issues.append(
                    f"brAInwav: Step {step['id']} depends on non-existent step {dep_id}"
                )

    # Simple cycle detection
    if _has_circular_dependencies(steps):
        issues.append("brAInwav: Plan contains circular dependencies")

    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "message": "brAInwav: Plan validation complete",
    }


def _has_circular_dependencies(steps: List[Dict[str, Any]]) -> bool:
    """
    Detect circular dependencies in plan steps.
    
    Following CODESTYLE.md: Helper function ≤40 lines
    """
    # Build adjacency list
    graph: Dict[str, List[str]] = {}
    for step in steps:
        step_id = step["id"]
        graph[step_id] = step.get("dependencies", [])

    # DFS cycle detection
    visited = set()
    rec_stack = set()

    def has_cycle(node: str) -> bool:
        visited.add(node)
        rec_stack.add(node)

        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                if has_cycle(neighbor):
                    return True
            elif neighbor in rec_stack:
                return True

        rec_stack.remove(node)
        return False

    for step_id in graph:
        if step_id not in visited:
            if has_cycle(step_id):
                return True

    return False
