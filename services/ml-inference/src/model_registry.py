"""
Model registry and versioning system for ML inference service.
Provides model management, A/B testing, and version control capabilities.
"""

import asyncio
import hashlib
import json
import time
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from enum import Enum
from pathlib import Path
from typing import Any

import aiofiles


class ModelStatus(str, Enum):
    """Model status enumeration."""

    PENDING = "pending"
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    DISABLED = "disabled"
    FAILED = "failed"


class DeploymentStrategy(str, Enum):
    """Deployment strategy for model rollouts."""

    BLUE_GREEN = "blue_green"
    CANARY = "canary"
    A_B_TEST = "a_b_test"
    ROLLING = "rolling"
    IMMEDIATE = "immediate"


@dataclass
class ModelMetadata:
    """Model metadata information."""

    model_id: str
    version: str
    name: str
    description: str
    model_type: str
    framework: str
    created_at: datetime
    created_by: str
    tags: list[str]
    parameters: dict[str, Any]
    performance_metrics: dict[str, float]
    file_hash: str
    file_size: int
    dependencies: list[str]
    status: ModelStatus = ModelStatus.PENDING


@dataclass
class ABTestConfig:
    """A/B testing configuration."""

    test_id: str
    model_a: str
    model_b: str
    traffic_split: float  # Percentage for model B (0.0 to 1.0)
    start_time: datetime
    end_time: datetime | None
    success_metrics: list[str]
    confidence_threshold: float = 0.95
    min_sample_size: int = 1000


@dataclass
class DeploymentConfig:
    """Model deployment configuration."""

    deployment_id: str
    model_version: str
    strategy: DeploymentStrategy
    target_environment: str
    rollout_percentage: float
    health_check_url: str
    rollback_threshold: float
    created_at: datetime
    created_by: str


class ModelRegistry:
    """
    Model registry for managing ML model versions, metadata, and deployments.
    """

    def __init__(self, registry_path: str = "./data/model_registry"):
        self.registry_path = Path(registry_path)
        self.registry_path.mkdir(parents=True, exist_ok=True)

        self.models_path = self.registry_path / "models"
        self.metadata_path = self.registry_path / "metadata"
        self.deployments_path = self.registry_path / "deployments"
        self.ab_tests_path = self.registry_path / "ab_tests"

        # Create subdirectories
        for path in [
            self.models_path,
            self.metadata_path,
            self.deployments_path,
            self.ab_tests_path,
        ]:
            path.mkdir(parents=True, exist_ok=True)

        self._active_models: dict[str, str] = {}  # model_name -> version
        self._model_metadata: dict[str, ModelMetadata] = {}
        self._ab_tests: dict[str, ABTestConfig] = {}
        self._deployments: dict[str, DeploymentConfig] = {}

        # Load existing data
        asyncio.create_task(self._load_registry())

    async def _load_registry(self) -> None:
        """Load registry data from disk."""
        try:
            # Load model metadata
            metadata_file = self.metadata_path / "registry.json"
            if metadata_file.exists():
                async with aiofiles.open(metadata_file) as f:
                    data = json.loads(await f.read())
                    for model_data in data.get("models", []):
                        metadata = ModelMetadata(**model_data)
                        metadata.created_at = datetime.fromisoformat(
                            model_data["created_at"]
                        )
                        self._model_metadata[f"{metadata.name}:{metadata.version}"] = (
                            metadata
                        )

            # Load active models
            active_file = self.metadata_path / "active_models.json"
            if active_file.exists():
                async with aiofiles.open(active_file) as f:
                    self._active_models = json.loads(await f.read())

            # Load A/B tests
            ab_tests_file = self.ab_tests_path / "active_tests.json"
            if ab_tests_file.exists():
                async with aiofiles.open(ab_tests_file) as f:
                    data = json.loads(await f.read())
                    for test_data in data.get("tests", []):
                        test_config = ABTestConfig(**test_data)
                        test_config.start_time = datetime.fromisoformat(
                            test_data["start_time"]
                        )
                        if test_data.get("end_time"):
                            test_config.end_time = datetime.fromisoformat(
                                test_data["end_time"]
                            )
                        self._ab_tests[test_config.test_id] = test_config

        except Exception as e:
            print(f"Error loading registry: {e}")

    async def _save_registry(self) -> None:
        """Save registry data to disk."""
        try:
            # Save model metadata
            metadata_data = {
                "models": [
                    {**asdict(metadata), "created_at": metadata.created_at.isoformat()}
                    for metadata in self._model_metadata.values()
                ]
            }
            metadata_file = self.metadata_path / "registry.json"
            async with aiofiles.open(metadata_file, "w") as f:
                await f.write(json.dumps(metadata_data, indent=2))

            # Save active models
            active_file = self.metadata_path / "active_models.json"
            async with aiofiles.open(active_file, "w") as f:
                await f.write(json.dumps(self._active_models, indent=2))

            # Save A/B tests
            ab_tests_data = {
                "tests": [
                    {
                        **asdict(test),
                        "start_time": test.start_time.isoformat(),
                        "end_time": test.end_time.isoformat()
                        if test.end_time
                        else None,
                    }
                    for test in self._ab_tests.values()
                ]
            }
            ab_tests_file = self.ab_tests_path / "active_tests.json"
            async with aiofiles.open(ab_tests_file, "w") as f:
                await f.write(json.dumps(ab_tests_data, indent=2))

        except Exception as e:
            print(f"Error saving registry: {e}")

    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA256 hash of a file."""
        hash_sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()

    async def register_model(
        self,
        model_path: str,
        name: str,
        version: str,
        description: str,
        model_type: str,
        framework: str,
        created_by: str,
        tags: list[str] | None = None,
        parameters: dict[str, Any] | None = None,
        performance_metrics: dict[str, float] | None = None,
        dependencies: list[str] | None = None,
    ) -> str:
        """Register a new model version."""

        model_path_obj = Path(model_path)
        if not model_path_obj.exists():
            raise ValueError(f"Model file not found: {model_path}")

        # Generate model ID
        model_id = f"{name}:{version}"

        # Check if version already exists
        if model_id in self._model_metadata:
            raise ValueError(f"Model version {model_id} already exists")

        # Calculate file hash and size
        file_hash = self._calculate_file_hash(model_path_obj)
        file_size = model_path_obj.stat().st_size

        # Create metadata
        metadata = ModelMetadata(
            model_id=model_id,
            version=version,
            name=name,
            description=description,
            model_type=model_type,
            framework=framework,
            created_at=datetime.now(UTC),
            created_by=created_by,
            tags=tags or [],
            parameters=parameters or {},
            performance_metrics=performance_metrics or {},
            file_hash=file_hash,
            file_size=file_size,
            dependencies=dependencies or [],
            status=ModelStatus.PENDING,
        )

        # Copy model file to registry
        registry_model_path = self.models_path / name / version
        registry_model_path.mkdir(parents=True, exist_ok=True)

        import shutil

        shutil.copy2(model_path, registry_model_path / model_path_obj.name)

        # Store metadata
        self._model_metadata[model_id] = metadata
        await self._save_registry()

        return model_id

    async def activate_model(self, model_id: str) -> None:
        """Activate a model version."""
        if model_id not in self._model_metadata:
            raise ValueError(f"Model {model_id} not found")

        metadata = self._model_metadata[model_id]
        self._active_models[metadata.name] = metadata.version
        metadata.status = ModelStatus.ACTIVE

        await self._save_registry()

    async def deactivate_model(self, model_name: str) -> None:
        """Deactivate a model."""
        if model_name in self._active_models:
            version = self._active_models[model_name]
            model_id = f"{model_name}:{version}"
            if model_id in self._model_metadata:
                self._model_metadata[model_id].status = ModelStatus.DEPRECATED
            del self._active_models[model_name]
            await self._save_registry()

    def get_active_model(self, model_name: str) -> str | None:
        """Get the active version of a model."""
        return self._active_models.get(model_name)

    def get_model_metadata(self, model_id: str) -> ModelMetadata | None:
        """Get metadata for a specific model version."""
        return self._model_metadata.get(model_id)

    def list_models(self, model_name: str | None = None) -> list[ModelMetadata]:
        """List all models or models for a specific name."""
        models = list(self._model_metadata.values())
        if model_name:
            models = [m for m in models if m.name == model_name]
        return sorted(models, key=lambda x: x.created_at, reverse=True)

    async def start_ab_test(
        self,
        test_id: str,
        model_a: str,
        model_b: str,
        traffic_split: float,
        duration_hours: int | None = None,
        success_metrics: list[str] | None = None,
    ) -> None:
        """Start an A/B test between two models."""

        # Validate models exist
        if model_a not in self._model_metadata:
            raise ValueError(f"Model A {model_a} not found")
        if model_b not in self._model_metadata:
            raise ValueError(f"Model B {model_b} not found")

        # Validate traffic split
        if not 0.0 <= traffic_split <= 1.0:
            raise ValueError("Traffic split must be between 0.0 and 1.0")

        start_time = datetime.now(UTC)
        end_time = None
        if duration_hours:
            from datetime import timedelta

            end_time = start_time + timedelta(hours=duration_hours)

        ab_test = ABTestConfig(
            test_id=test_id,
            model_a=model_a,
            model_b=model_b,
            traffic_split=traffic_split,
            start_time=start_time,
            end_time=end_time,
            success_metrics=success_metrics or ["accuracy", "response_time"],
            confidence_threshold=0.95,
            min_sample_size=1000,
        )

        self._ab_tests[test_id] = ab_test
        await self._save_registry()

    async def stop_ab_test(self, test_id: str) -> None:
        """Stop an A/B test."""
        if test_id in self._ab_tests:
            self._ab_tests[test_id].end_time = datetime.now(UTC)
            await self._save_registry()

    def get_ab_test(self, test_id: str) -> ABTestConfig | None:
        """Get A/B test configuration."""
        return self._ab_tests.get(test_id)

    def list_active_ab_tests(self) -> list[ABTestConfig]:
        """List all active A/B tests."""
        now = datetime.now(UTC)
        return [
            test
            for test in self._ab_tests.values()
            if test.end_time is None or test.end_time > now
        ]

    def should_use_model_b(self, test_id: str, user_id: str) -> bool:
        """Determine if a user should see model B in an A/B test."""
        test = self._ab_tests.get(test_id)
        if not test:
            return False

        # Check if test is active
        now = datetime.now(UTC)
        if test.end_time and test.end_time < now:
            return False

        # Use consistent hashing for user assignment
        hash_input = f"{test_id}:{user_id}"
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
        user_bucket = (hash_value % 100) / 100.0

        return user_bucket < test.traffic_split

    async def delete_model(self, model_id: str) -> None:
        """Delete a model version."""
        if model_id not in self._model_metadata:
            raise ValueError(f"Model {model_id} not found")

        metadata = self._model_metadata[model_id]

        # Remove from active models if it's active
        if (
            metadata.name in self._active_models
            and self._active_models[metadata.name] == metadata.version
        ):
            del self._active_models[metadata.name]

        # Remove model files
        model_dir = self.models_path / metadata.name / metadata.version
        if model_dir.exists():
            import shutil

            shutil.rmtree(model_dir)

        # Remove metadata
        del self._model_metadata[model_id]
        await self._save_registry()

    def get_registry_stats(self) -> dict[str, Any]:
        """Get registry statistics."""
        total_models = len(self._model_metadata)
        active_models = len(self._active_models)
        active_tests = len(self.list_active_ab_tests())

        status_counts = {}
        for metadata in self._model_metadata.values():
            status = metadata.status.value
            status_counts[status] = status_counts.get(status, 0) + 1

        return {
            "total_models": total_models,
            "active_models": active_models,
            "active_ab_tests": active_tests,
            "status_distribution": status_counts,
            "registry_size_gb": sum(m.file_size for m in self._model_metadata.values())
            / (1024**3),
        }


class ModelVersionManager:
    """
    High-level model version management interface.
    """

    def __init__(self, registry: ModelRegistry):
        self.registry = registry

    async def deploy_model(
        self,
        model_id: str,
        strategy: DeploymentStrategy = DeploymentStrategy.IMMEDIATE,
        environment: str = "production",
        rollout_percentage: float = 100.0,
    ) -> str:
        """Deploy a model with specified strategy."""

        deployment_id = f"deploy_{int(time.time())}"

        if strategy == DeploymentStrategy.IMMEDIATE:
            # Immediate deployment - activate model right away
            await self.registry.activate_model(model_id)

        elif strategy == DeploymentStrategy.CANARY:
            # Canary deployment - start with small percentage
            # This would integrate with load balancer/traffic routing
            pass

        elif strategy == DeploymentStrategy.A_B_TEST:
            # A/B test deployment
            # Create A/B test configuration
            pass

        return deployment_id

    async def rollback_model(self, model_name: str, target_version: str) -> None:
        """Rollback to a previous model version."""
        target_model_id = f"{model_name}:{target_version}"

        if target_model_id not in self.registry._model_metadata:
            raise ValueError(f"Target version {target_model_id} not found")

        await self.registry.activate_model(target_model_id)

    async def promote_model(self, model_id: str, from_env: str, to_env: str) -> None:
        """Promote a model from one environment to another."""
        # This would handle environment-specific model promotion
        # For now, just activate the model
        await self.registry.activate_model(model_id)

    def get_model_lineage(self, model_name: str) -> list[ModelMetadata]:
        """Get the version history/lineage for a model."""
        return self.registry.list_models(model_name)
