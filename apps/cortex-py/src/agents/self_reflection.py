"""
Self-Reflection Module for Cortex-Py (Phase 4.2)

Enables agents to critique and improve their own outputs through
iterative self-reflection loops.

Following CODESTYLE.md:
- snake_case naming
- Type hints on all public functions
- Guard clauses for readability
- Functions ≤40 lines
- brAInwav branding in outputs
"""

import json
from datetime import datetime, timezone
from typing import Dict, Any, List
from src.multimodal.types import Memory, Modality


class ReflectionError(Exception):
    """brAInwav reflection error"""

    pass


class SelfReflector:
    """
    Self-reflection system for agent output critique and improvement.
    
    Analyzes outputs, generates feedback, and tracks improvements
    across multiple iterations.
    """

    def __init__(
        self,
        quality_threshold: float = 0.7,
        max_iterations: int = 3,
    ):
        """
        Initialize self-reflector.
        
        Args:
            quality_threshold: Minimum quality score (0-1)
            max_iterations: Maximum improvement iterations
        """
        self.quality_threshold = quality_threshold
        self.max_iterations = max_iterations

    def critique_output(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze and critique an agent output.
        
        Args:
            output: Agent output to critique
        
        Returns:
            Critique with quality score and issues
        
        Following CODESTYLE.md: Guard clauses for validation
        """
        # Guard: output must have content
        if not output or "content" not in output:
            raise ReflectionError("brAInwav: Output must have content field")

        # Assess quality
        quality_score = self._assess_quality(output)

        # Identify issues
        issues = self._identify_issues(output, quality_score)

        # Generate suggestions
        suggestions = self._generate_suggestions(issues)

        # Create critique
        critique = {
            "quality_score": quality_score,
            "approved": quality_score >= self.quality_threshold,
            "issues": issues,
            "suggestions": suggestions,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "brAInwav_metadata": {
                "analyzer": "brAInwav Self-Reflector",
                "version": "1.0.0",
            },
        }

        return critique

    def generate_feedback(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate actionable feedback for output improvement.
        
        Args:
            output: Agent output
        
        Returns:
            Feedback with action items
        
        Following CODESTYLE.md: Guard clauses
        """
        # Guard: validate output
        if not output:
            raise ReflectionError("brAInwav: Cannot generate feedback for empty output")

        # Critique first
        critique = self.critique_output(output)

        # Generate action items
        action_items = self._create_action_items(critique, output)

        # Create feedback
        feedback = {
            "action_items": action_items,
            "priority_issues": [
                item for item in action_items if item["priority"] == "high"
            ],
            "quality_score": critique["quality_score"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "brAInwav_feedback": True,
        }

        return feedback

    def improve_output(
        self, output: Dict[str, Any], feedback: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Apply feedback to improve output.
        
        Args:
            output: Original output
            feedback: Feedback to apply
        
        Returns:
            Improved output
        
        Following CODESTYLE.md: Guard clauses
        """
        # Guard: check max iterations
        current_iteration = output.get("iteration", 0)
        if current_iteration >= self.max_iterations:
            return output  # No more improvements

        # Apply improvements
        improved = output.copy()
        improved["iteration"] = current_iteration + 1
        improved["improvement_applied"] = True

        # Simulate improvement (in production, would use LLM)
        improved["content"] = self._apply_improvements(
            output["content"], feedback["action_items"]
        )

        # Boost confidence slightly
        original_confidence = output.get("confidence", 0.5)
        improved["confidence"] = min(1.0, original_confidence + 0.2)

        return improved

    def should_retry(
        self, output: Dict[str, Any], critique: Dict[str, Any]
    ) -> bool:
        """
        Determine if output should be retried.
        
        Args:
            output: Agent output
            critique: Critique result
        
        Returns:
            True if should retry
        
        Following CODESTYLE.md: Simple boolean logic
        """
        # Check iteration limit
        if output.get("iteration", 0) >= self.max_iterations:
            return False

        # Check quality threshold
        if critique["quality_score"] >= self.quality_threshold:
            return False

        # Retry if quality is low
        return True

    def track_improvements(
        self, iterations: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Track improvement across iterations.
        
        Args:
            iterations: List of output iterations
        
        Returns:
            Augmented iterations with improvement deltas
        
        Following CODESTYLE.md: Guard clauses
        """
        # Guard: need at least one iteration
        if not iterations:
            return []

        tracked = []

        for i, iteration in enumerate(iterations):
            tracked_iter = iteration.copy()

            # Calculate improvement from previous
            if i > 0:
                prev_confidence = iterations[i - 1].get("confidence", 0)
                curr_confidence = iteration.get("confidence", 0)
                tracked_iter["improvement_delta"] = (
                    curr_confidence - prev_confidence
                )
            else:
                tracked_iter["improvement_delta"] = 0.0

            tracked.append(tracked_iter)

        return tracked

    def calculate_improvement_metrics(
        self, iterations: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """
        Calculate improvement success metrics.
        
        Args:
            iterations: List of iterations
        
        Returns:
            Metrics dictionary
        
        Following CODESTYLE.md: Guard clauses
        """
        # Guard: need iterations
        if not iterations or len(iterations) < 2:
            return {"success_rate": 0.0, "avg_improvement": 0.0}

        # Calculate average improvement
        total_improvement = 0.0
        improved_count = 0

        for i in range(1, len(iterations)):
            prev = iterations[i - 1].get("confidence", 0)
            curr = iterations[i].get("confidence", 0)

            delta = curr - prev
            total_improvement += delta

            if delta > 0:
                improved_count += 1

        avg_improvement = total_improvement / (len(iterations) - 1)
        success_rate = improved_count / (len(iterations) - 1)

        return {
            "success_rate": success_rate,
            "avg_improvement": avg_improvement,
            "total_iterations": len(iterations),
        }

    def reflection_to_memory(
        self, critique: Dict[str, Any], output: Dict[str, Any]
    ) -> Memory:
        """
        Convert reflection to Memory format for storage.
        
        Args:
            critique: Critique result
            output: Original output
        
        Returns:
            Memory object
        
        Following CODESTYLE.md: Guard clauses
        """
        # Guard: validate inputs
        if not critique or not output:
            raise ReflectionError("brAInwav: Invalid reflection data")

        # Combine critique and output
        reflection_data = {
            "critique": critique,
            "output": output,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Create memory
        memory: Memory = {
            "id": f"reflection-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            "kind": "artifact",
            "modality": Modality.TEXT,
            "text": json.dumps(reflection_data, indent=2),
            "tags": ["reflection", "critique", "self-improvement"],
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "provenance": {
                "source": "agent",
                "actor": "self-reflector",
            },
            "metadata": {
                "quality_score": critique["quality_score"],
                "approved": critique["approved"],
                "brAInwav": True,
            },
        }

        return memory

    # Private helper methods (all ≤40 lines)

    def _assess_quality(self, output: Dict[str, Any]) -> float:
        """Assess output quality score (0-1)."""
        # Guard: default to medium quality
        if "confidence" not in output:
            return 0.5

        # Use confidence as primary signal
        confidence = output.get("confidence", 0.5)

        # Boost if has reasoning
        if output.get("reasoning"):
            confidence = min(1.0, confidence + 0.1)

        # Penalty for very short content
        content = output.get("content", "")
        if len(content) < 20:
            confidence = max(0.0, confidence - 0.2)

        return confidence

    def _identify_issues(
        self, output: Dict[str, Any], quality_score: float
    ) -> List[str]:
        """Identify specific issues in output."""
        issues = []

        # Low confidence
        if output.get("confidence", 1.0) < 0.5:
            issues.append("brAInwav: Low confidence score")

        # Missing reasoning
        if not output.get("reasoning"):
            issues.append("brAInwav: No reasoning provided")

        # Short content
        if len(output.get("content", "")) < 20:
            issues.append("brAInwav: Content too brief")

        return issues

    def _generate_suggestions(self, issues: List[str]) -> List[str]:
        """Generate improvement suggestions from issues."""
        suggestions = []

        for issue in issues:
            if "confidence" in issue.lower():
                suggestions.append("Add more detail and certainty")
            elif "reasoning" in issue.lower():
                suggestions.append("Explain your thought process")
            elif "brief" in issue.lower():
                suggestions.append("Expand with more comprehensive details")

        return suggestions

    def _create_action_items(
        self, critique: Dict[str, Any], output: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Create prioritized action items."""
        action_items = []

        # High priority: critical issues
        if critique["quality_score"] <= 0.5:
            action_items.append(
                {
                    "action": "Rewrite with comprehensive details",
                    "priority": "high",
                }
            )

        # Medium priority: missing components
        if not output.get("reasoning"):
            action_items.append(
                {
                    "action": "Add reasoning explanation",
                    "priority": "medium",
                }
            )

        # Apply all suggestions
        for suggestion in critique.get("suggestions", []):
            action_items.append({"action": suggestion, "priority": "medium"})

        return action_items

    def _apply_improvements(
        self, content: str, action_items: List[Dict[str, Any]]
    ) -> str:
        """Apply action items to improve content."""
        # In production, would use LLM to apply improvements
        # For testing, simulate improvement
        if not content:
            return "Improved: Added comprehensive details"

        # Add marker to show improvement applied
        improved = f"{content} (brAInwav improved)"

        return improved
