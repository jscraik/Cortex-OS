"""
Tree-of-Thought (ToT) Planner for Cortex-Py (Phase 4.3)

Generates multiple solution branches and selects optimal path.

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


class ToTPlanningError(Exception):
    """brAInwav ToT planning error"""

    pass


class ToTPlanner:
    """
    Tree-of-Thought planner for multi-branch exploration.
    
    Generates multiple solution paths, scores each branch,
    and selects the optimal approach.
    """

    def __init__(self, max_branches: int = 5, score_threshold: float = 5.0):
        """
        Initialize ToT planner.
        
        Args:
            max_branches: Maximum branches to generate (2-5)
            score_threshold: Minimum score to keep branch
        """
        self.max_branches = min(max(max_branches, 2), 5)
        self.score_threshold = score_threshold

    def generate_plan(
        self, goal: str, context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate Tree-of-Thought plan with multiple branches.
        
        Args:
            goal: High-level goal to achieve
            context: Additional context for planning
        
        Returns:
            ToT plan with multiple scored branches
        
        Following CODESTYLE.md: Guard clauses
        """
        # Guard: empty goal
        if not goal or not goal.strip():
            raise ToTPlanningError("brAInwav: Goal cannot be empty")

        # Generate multiple solution branches
        branches = self._generate_branches(goal, context)

        # Score each branch
        scored_branches = self._score_branches(branches)

        # Sort by score (highest first)
        sorted_branches = sorted(
            scored_branches, key=lambda b: b["score"], reverse=True
        )

        # Prune low-scoring branches
        pruned_branches = prune_branches(
            sorted_branches,
            threshold=self.score_threshold,
            max_keep=self.max_branches,
            min_keep=1,
        )

        # Select best branch
        best_branch_id = select_best_branch(pruned_branches)

        # Create ToT plan
        plan = {
            "id": f"tot-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            "strategy": "tot",
            "goal": goal,
            "branches": pruned_branches,
            "best_branch_id": best_branch_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "brAInwav_metadata": {
                "created_by": "brAInwav ToT Planner",
                "version": "1.0.0",
                "branch_count": len(pruned_branches),
            },
        }

        return plan

    def _generate_branches(
        self, goal: str, context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Generate 2-5 alternative solution branches.
        
        Following CODESTYLE.md: Guard clauses for simple cases
        """
        branches = []

        # Determine number of branches based on complexity
        num_branches = self._determine_branch_count(goal, context)

        # Generate alternative approaches
        if "authentication" in goal.lower():
            branches = self._generate_auth_branches(goal)
        elif "performance" in goal.lower() or "optimize" in goal.lower():
            branches = self._generate_performance_branches(goal)
        elif "architecture" in goal.lower() or "design" in goal.lower():
            branches = self._generate_architecture_branches(goal)
        else:
            branches = self._generate_generic_branches(goal, num_branches)

        return branches[:num_branches]

    def _determine_branch_count(
        self, goal: str, context: Dict[str, Any]
    ) -> int:
        """Determine optimal number of branches."""
        # Guard: complex problems get more branches
        if len(goal) > 100 or "complex" in goal.lower():
            return 5

        if "architecture" in goal.lower() or "design" in goal.lower():
            return 4

        # Default: 3 branches
        return 3

    def _generate_auth_branches(self, goal: str) -> List[Dict[str, Any]]:
        """Generate authentication-specific branches."""
        return [
            {
                "id": "branch-jwt",
                "description": "JWT-based authentication (stateless)",
                "steps": [
                    {"id": "s1", "description": "Implement JWT token generation"},
                    {"id": "s2", "description": "Add token validation middleware"},
                    {"id": "s3", "description": "Implement refresh token logic"},
                ],
            },
            {
                "id": "branch-session",
                "description": "Session-based authentication (server-side)",
                "steps": [
                    {"id": "s1", "description": "Setup session store"},
                    {"id": "s2", "description": "Implement session creation"},
                    {"id": "s3", "description": "Add session cleanup"},
                ],
            },
            {
                "id": "branch-oauth",
                "description": "OAuth 2.0 integration (industry standard)",
                "steps": [
                    {"id": "s1", "description": "Configure OAuth provider"},
                    {"id": "s2", "description": "Implement OAuth flow"},
                    {"id": "s3", "description": "Handle callbacks and tokens"},
                ],
            },
        ]

    def _generate_performance_branches(
        self, goal: str
    ) -> List[Dict[str, Any]]:
        """Generate performance optimization branches."""
        return [
            {
                "id": "branch-caching",
                "description": "Caching layer optimization",
                "steps": [
                    {"id": "s1", "description": "Add Redis cache"},
                    {"id": "s2", "description": "Implement cache invalidation"},
                ],
            },
            {
                "id": "branch-database",
                "description": "Database query optimization",
                "steps": [
                    {"id": "s1", "description": "Add database indexes"},
                    {"id": "s2", "description": "Optimize N+1 queries"},
                ],
            },
            {
                "id": "branch-code",
                "description": "Code profiling and refactoring",
                "steps": [
                    {"id": "s1", "description": "Profile hot paths"},
                    {"id": "s2", "description": "Refactor bottlenecks"},
                ],
            },
        ]

    def _generate_architecture_branches(
        self, goal: str
    ) -> List[Dict[str, Any]]:
        """Generate architecture design branches."""
        return [
            {
                "id": "branch-monolith",
                "description": "Monolithic architecture",
                "steps": [
                    {"id": "s1", "description": "Single codebase design"},
                    {"id": "s2", "description": "Shared database"},
                ],
            },
            {
                "id": "branch-microservices",
                "description": "Microservices architecture",
                "steps": [
                    {"id": "s1", "description": "Service decomposition"},
                    {"id": "s2", "description": "API gateway setup"},
                ],
            },
            {
                "id": "branch-serverless",
                "description": "Serverless architecture",
                "steps": [
                    {"id": "s1", "description": "Function decomposition"},
                    {"id": "s2", "description": "Event-driven design"},
                ],
            },
        ]

    def _generate_generic_branches(
        self, goal: str, count: int
    ) -> List[Dict[str, Any]]:
        """Generate generic solution branches."""
        branches = []

        for i in range(count):
            branches.append(
                {
                    "id": f"branch-{i+1}",
                    "description": f"Approach {i+1}: {goal}",
                    "steps": [
                        {"id": "s1", "description": f"Research approach {i+1}"},
                        {"id": "s2", "description": f"Implement solution {i+1}"},
                        {"id": "s3", "description": f"Test and validate {i+1}"},
                    ],
                }
            )

        return branches

    def _score_branches(
        self, branches: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Score each branch on multiple criteria.
        
        Following CODESTYLE.md: Guard clauses
        """
        # Guard: no branches
        if not branches:
            return []

        scored = []

        for branch in branches:
            # Calculate score based on heuristics
            score = self._calculate_branch_score(branch)

            branch["score"] = round(score, 1)
            branch["criteria"] = {
                "feasibility": round(score * 0.9, 1),
                "efficiency": round(score * 1.1, 1),
                "completeness": round(score, 1),
            }

            scored.append(branch)

        return scored

    def _calculate_branch_score(self, branch: Dict[str, Any]) -> float:
        """Calculate score for a single branch."""
        # Base score
        score = 7.0

        # Boost for specific approaches
        description = branch.get("description", "").lower()

        if "oauth" in description or "industry standard" in description:
            score = 9.0
        elif "caching" in description or "optimization" in description:
            score = 8.5
        elif "microservices" in description:
            score = 8.0
        elif "session" in description or "monolith" in description:
            score = 7.5
        elif "serverless" in description:
            score = 7.0

        # Adjust based on step count
        steps = branch.get("steps", [])
        if len(steps) >= 3:
            score += 0.5

        return min(10.0, score)

    def plan_to_memory(self, plan: Dict[str, Any]) -> Memory:
        """
        Convert ToT plan to Memory format.
        
        Args:
            plan: ToT plan dictionary
        
        Returns:
            Memory object
        
        Following CODESTYLE.md: Guard clauses
        """
        # Guard: plan must have required fields
        if "id" not in plan or "goal" not in plan:
            raise ToTPlanningError("brAInwav: Invalid ToT plan structure")

        memory: Memory = {
            "id": plan["id"],
            "kind": "artifact",
            "modality": Modality.TEXT,
            "text": json.dumps(plan, indent=2),
            "tags": ["planning", "tot", "multi-branch", plan["strategy"]],
            "createdAt": plan.get(
                "created_at", datetime.now(timezone.utc).isoformat()
            ),
            "updatedAt": plan.get(
                "created_at", datetime.now(timezone.utc).isoformat()
            ),
            "provenance": {"source": "agent", "actor": "tot-planner"},
            "metadata": {
                "goal": plan["goal"],
                "branch_count": len(plan.get("branches", [])),
                "best_branch": plan.get("best_branch_id"),
                "brAInwav": True,
            },
        }

        return memory

    def memory_to_plan(self, memory: Memory) -> Dict[str, Any]:
        """
        Reconstruct ToT plan from Memory.
        
        Args:
            memory: Memory object containing plan
        
        Returns:
            Reconstructed plan
        
        Following CODESTYLE.md: Guard clauses
        """
        # Guard: memory must have text
        if not memory.get("text"):
            raise ToTPlanningError("brAInwav: Memory has no text content")

        try:
            plan = json.loads(memory["text"])
            return plan
        except json.JSONDecodeError as e:
            raise ToTPlanningError(
                f"brAInwav: Failed to parse ToT plan - {e}"
            ) from e


# Helper functions (all ≤40 lines)


def prune_branches(
    branches: List[Dict[str, Any]],
    threshold: float = 5.0,
    max_keep: int = 3,
    min_keep: int = 1,
) -> List[Dict[str, Any]]:
    """
    Prune low-scoring branches.
    
    Args:
        branches: List of branches to prune
        threshold: Minimum score to keep
        max_keep: Maximum branches to keep
        min_keep: Minimum branches to keep
    
    Returns:
        Pruned branch list
    
    Following CODESTYLE.md: Guard clauses
    """
    # Guard: no branches
    if not branches:
        return []

    # Filter by threshold
    above_threshold = [b for b in branches if b.get("score", 0) >= threshold]

    # Guard: keep at least min_keep
    if len(above_threshold) < min_keep:
        # Sort and keep best branches
        sorted_branches = sorted(
            branches, key=lambda b: b.get("score", 0), reverse=True
        )
        return sorted_branches[:min_keep]

    # Keep top max_keep
    return above_threshold[:max_keep]


def select_best_branch(branches: List[Dict[str, Any]]) -> str:
    """
    Select best branch ID.
    
    Args:
        branches: List of branches
    
    Returns:
        ID of best-scoring branch
    
    Following CODESTYLE.md: Guard clauses
    """
    # Guard: no branches
    if not branches:
        raise ToTPlanningError("brAInwav: No branches to select from")

    # Find highest score
    best_branch = max(branches, key=lambda b: b.get("score", 0))

    return best_branch["id"]
