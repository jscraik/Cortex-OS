#!/usr/bin/env python3
"""
Comprehensive test suite for Tiered Model Manager

Tests cover:
- Smart model selection based on task complexity
- Memory-aware loading and eviction
- Tier enforcement (always_on, frequent, on_demand)
- Integration with model configurations
- Mock MLX integration for testing environments
"""

import asyncio
import pytest
pytest.importorskip("mlx")
import time
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any

# Import the module under test
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tiered_model_manager import (
    TieredMLXModelManager, 
    ModelTier, 
    ModelConfig, 
    LoadedModel
)


class TestModelConfig:
    """Test suite for ModelConfig dataclass"""
    
    def test_model_config_creation(self):
        """Test ModelConfig creation with required fields"""
        config = ModelConfig(
            id="test-model-id",
            name="test-model",
            ram_gb=4.0,
            tier=ModelTier.FREQUENT,
            use_cases=["testing", "validation"],
            priority="medium"
        )
        
        assert config.id == "test-model-id"
        assert config.name == "test-model"
        assert config.ram_gb == 4.0
        assert config.tier == ModelTier.FREQUENT
        assert config.use_cases == ["testing", "validation"]
        assert config.priority == "medium"
        assert config.tokens_per_second == 80  # default
        assert config.context_length == 4096  # default
        assert config.specializations == []  # default after __post_init__

    def test_model_config_with_specializations(self):
        """Test ModelConfig with custom specializations"""
        config = ModelConfig(
            id="test-model",
            name="test",
            ram_gb=2.0,
            tier=ModelTier.ALWAYS_ON,
            use_cases=["test"],
            priority="high",
            specializations=["speed", "accuracy"]
        )
        
        assert config.specializations == ["speed", "accuracy"]

    def test_model_config_post_init(self):
        """Test ModelConfig __post_init__ method"""
        config = ModelConfig(
            id="test",
            name="test",
            ram_gb=1.0,
            tier=ModelTier.ALWAYS_ON,
            use_cases=["test"],
            priority="low"
        )
        
        # Should initialize empty specializations list
        assert config.specializations == []


class TestLoadedModel:
    """Test suite for LoadedModel dataclass"""
    
    def test_loaded_model_creation(self):
        """Test LoadedModel creation"""
        config = ModelConfig(
            id="test", name="test", ram_gb=1.0, tier=ModelTier.ALWAYS_ON,
            use_cases=["test"], priority="low"
        )
        
        model = Mock()
        tokenizer = Mock()
        loaded_time = time.time()
        
        loaded_model = LoadedModel(
            config=config,
            model=model,
            tokenizer=tokenizer,
            loaded_at=loaded_time,
            last_used=loaded_time
        )
        
        assert loaded_model.config == config
        assert loaded_model.model == model
        assert loaded_model.tokenizer == tokenizer
        assert loaded_model.loaded_at == loaded_time
        assert loaded_model.last_used == loaded_time
        assert loaded_model.usage_count == 0

    def test_loaded_model_update_usage(self):
        """Test LoadedModel usage tracking"""
        config = ModelConfig(
            id="test", name="test", ram_gb=1.0, tier=ModelTier.ALWAYS_ON,
            use_cases=["test"], priority="low"
        )
        
        loaded_model = LoadedModel(
            config=config,
            model=Mock(),
            tokenizer=Mock(),
            loaded_at=time.time(),
            last_used=time.time()
        )
        
        initial_time = loaded_model.last_used
        initial_count = loaded_model.usage_count
        
        time.sleep(0.01)  # Small delay to ensure time difference
        loaded_model.update_usage()
        
        assert loaded_model.last_used > initial_time
        assert loaded_model.usage_count == initial_count + 1


class TestTieredMLXModelManager:
    """Test suite for TieredMLXModelManager"""
    
    @pytest.fixture
    def model_manager(self):
        """Create model manager instance for testing"""
        with patch('tiered_model_manager.asyncio.create_task'):
            manager = TieredMLXModelManager(max_memory_gb=16)
            return manager

    def test_initialization(self, model_manager):
        """Test model manager initialization"""
        assert model_manager.max_memory_gb == 16
        assert isinstance(model_manager.model_configs, dict)
        assert len(model_manager.model_configs) > 0
        assert model_manager.loaded_models == {}
        assert model_manager.memory_usage_gb == 0.0
        assert model_manager.total_loads == 0
        assert model_manager.total_evictions == 0
        assert model_manager.load_failures == 0

    def test_initialization_default_memory(self):
        """Test initialization with default memory limit"""
        with patch('tiered_model_manager.asyncio.create_task'):
            manager = TieredMLXModelManager()
            assert manager.max_memory_gb == 28

    def test_model_configurations_loaded(self, model_manager):
        """Test that model configurations are properly loaded"""
        configs = model_manager.model_configs
        
        # Test specific models exist
        assert "gemma-3-270m" in configs
        assert "phi3-mini" in configs
        assert "mixtral" in configs
        assert "qwen3-coder" in configs
        assert "qwen3-instruct" in configs
        
        # Test model tiers are correct
        assert configs["gemma-3-270m"].tier == ModelTier.ALWAYS_ON
        assert configs["phi3-mini"].tier == ModelTier.ALWAYS_ON
        assert configs["mixtral"].tier == ModelTier.FREQUENT
        assert configs["qwen3-coder"].tier == ModelTier.ON_DEMAND
        assert configs["qwen3-instruct"].tier == ModelTier.ON_DEMAND

    def test_tier_memory_limits(self, model_manager):
        """Test tier memory limits are correctly configured"""
        assert model_manager.tier_limits[ModelTier.ALWAYS_ON] == 1.0
        assert model_manager.tier_limits[ModelTier.FREQUENT] == 5.0
        assert model_manager.tier_limits[ModelTier.ON_DEMAND] == 22.0

    def test_calculate_task_complexity_simple(self, model_manager):
        """Test task complexity calculation for simple tasks"""
        task_description = "Simple utility task"
        complexity = model_manager.calculate_task_complexity(task_description)
        
        assert 0.0 <= complexity <= 1.0
        assert complexity < 0.3  # Should be classified as simple

    def test_calculate_task_complexity_moderate(self, model_manager):
        """Test task complexity calculation for moderate tasks"""
        task_description = "Standard analysis task"
        complexity = model_manager.calculate_task_complexity(task_description)
        
        assert 0.0 <= complexity <= 1.0
        assert 0.3 <= complexity < 0.6  # Should be classified as moderate

    def test_calculate_task_complexity_complex(self, model_manager):
        """Test task complexity calculation for complex tasks"""
        task_description = "Complex research analysis with advanced reasoning"
        complexity = model_manager.calculate_task_complexity(task_description)
        
        assert 0.0 <= complexity <= 1.0
        assert complexity >= 0.6  # Should be classified as complex

    def test_calculate_task_complexity_with_context_length(self, model_manager):
        """Test task complexity with large context length"""
        task_description = "Standard task"
        base_complexity = model_manager.calculate_task_complexity(task_description)
        
        # With large context
        large_context_complexity = model_manager.calculate_task_complexity(
            task_description, context_length=15000
        )
        
        assert large_context_complexity > base_complexity

    def test_calculate_task_complexity_domain_specific(self, model_manager):
        """Test task complexity for domain-specific tasks"""
        # Code task should have higher complexity
        code_task = "Programming and debugging task"
        code_complexity = model_manager.calculate_task_complexity(code_task)
        
        # General task
        general_task = "General conversation"
        general_complexity = model_manager.calculate_task_complexity(general_task)
        
        assert code_complexity > general_complexity

    def test_smart_load_simple_task(self, model_manager):
        """Test smart model selection for simple tasks"""
        task_description = "Simple utility task"
        
        with patch.object(model_manager, '_can_load_model', return_value=True), \
             patch.object(model_manager, 'load_model', return_value=asyncio.create_task(self._mock_async_true())):
            
            selected_model = model_manager.smart_load(task_description)
            
            # Should select always_on model for simple tasks
            assert selected_model in ["gemma-3-270m", "phi3-mini"]

    def test_smart_load_complex_task(self, model_manager):
        """Test smart model selection for complex tasks"""
        task_description = "Complex code generation and analysis"
        
        with patch.object(model_manager, '_can_load_model', return_value=True), \
             patch.object(model_manager, 'load_model', return_value=asyncio.create_task(self._mock_async_true())):
            
            selected_model = model_manager.smart_load(task_description)
            
            # Should select specialized code model for complex code tasks
            assert selected_model in ["qwen3-coder", "qwen3-instruct"]

    def test_smart_load_vision_task(self, model_manager):
        """Test smart model selection for vision tasks"""
        task_description = "Analyze this image and provide visual description"
        
        with patch.object(model_manager, '_can_load_model', return_value=True), \
             patch.object(model_manager, 'load_model', return_value=asyncio.create_task(self._mock_async_true())):
            
            selected_model = model_manager.smart_load(task_description)
            
            # Should select vision-capable model
            assert selected_model == "qwen2.5-vl"

    async def _mock_async_true(self):
        """Mock async function that returns True"""
        return True

    def test_smart_load_no_suitable_model(self, model_manager):
        """Test smart model selection when no models can be loaded"""
        task_description = "Any task"
        
        with patch.object(model_manager, '_can_load_model', return_value=False):
            selected_model = model_manager.smart_load(task_description)
            assert selected_model is None

    def test_smart_load_fallback_to_loaded(self, model_manager):
        """Test smart model selection falls back to already loaded models"""
        task_description = "Complex task"
        
        # Mock a loaded model
        model_manager.loaded_models["phi3-mini"] = Mock()
        
        with patch.object(model_manager, '_can_load_model', return_value=False), \
             patch.object(model_manager, '_model_suitable_for_task', return_value=True):
            
            selected_model = model_manager.smart_load(task_description)
            assert selected_model == "phi3-mini"

    def test_model_suitable_for_task_use_case_match(self, model_manager):
        """Test model suitability based on use cases"""
        # Code task should match qwen3-coder use cases
        is_suitable = model_manager._model_suitable_for_task("qwen3-coder", "code generation task")
        assert is_suitable is True
        
        # Conversation task should not match qwen3-coder use cases strongly
        is_suitable = model_manager._model_suitable_for_task("qwen3-coder", "general conversation")
        assert is_suitable is False

    def test_model_suitable_for_task_specialization_match(self, model_manager):
        """Test model suitability based on specializations"""
        # Test with model that has specializations
        config = model_manager.model_configs["qwen3-coder"]
        config.specializations = ["function_calling", "repository_understanding"]
        
        is_suitable = model_manager._model_suitable_for_task("qwen3-coder", "function calling task")
        assert is_suitable is True

    def test_model_suitable_for_task_unknown_model(self, model_manager):
        """Test model suitability for unknown model"""
        is_suitable = model_manager._model_suitable_for_task("unknown-model", "any task")
        assert is_suitable is False

    def test_can_load_model_already_loaded(self, model_manager):
        """Test _can_load_model for already loaded model"""
        model_manager.loaded_models["phi3-mini"] = Mock()
        
        can_load = model_manager._can_load_model("phi3-mini")
        assert can_load is True

    def test_can_load_model_sufficient_memory(self, model_manager):
        """Test _can_load_model with sufficient memory"""
        # Small model with plenty of memory available
        can_load = model_manager._can_load_model("gemma-3-270m")
        assert can_load is True

    def test_can_load_model_insufficient_memory(self, model_manager):
        """Test _can_load_model with insufficient memory"""
        # Fill up memory
        model_manager.memory_usage_gb = model_manager.max_memory_gb - 1.0
        
        # Try to load large model
        with patch.object(model_manager, '_evict_for_space', return_value=False):
            can_load = model_manager._can_load_model("qwen3-instruct")
            assert can_load is False

    def test_can_load_model_unknown_model(self, model_manager):
        """Test _can_load_model for unknown model"""
        can_load = model_manager._can_load_model("unknown-model")
        assert can_load is False

    def test_can_load_model_with_eviction(self, model_manager):
        """Test _can_load_model with successful eviction"""
        model_manager.memory_usage_gb = model_manager.max_memory_gb - 1.0
        
        with patch.object(model_manager, '_evict_for_space', return_value=True):
            can_load = model_manager._can_load_model("qwen3-instruct")
            assert can_load is True

    @pytest.mark.asyncio
    async def test_load_model_success(self, model_manager):
        """Test successful model loading"""
        model_name = "phi3-mini"
        
        with patch('tiered_model_manager.load') as mock_load:
            
            mock_model = Mock()
            mock_tokenizer = Mock()
            mock_load.return_value = (mock_model, mock_tokenizer)
            
            success = await model_manager.load_model(model_name)
            
            assert success is True
            assert model_name in model_manager.loaded_models
            assert model_manager.total_loads == 1
            assert model_manager.memory_usage_gb > 0

    @pytest.mark.asyncio
    async def test_load_model_already_loaded(self, model_manager):
        """Test loading already loaded model"""
        model_name = "phi3-mini"
        
        # Mock already loaded model
        loaded_model = Mock()
        loaded_model.update_usage = Mock()
        model_manager.loaded_models[model_name] = loaded_model
        
        success = await model_manager.load_model(model_name)
        
        assert success is True
        loaded_model.update_usage.assert_called_once()

    @pytest.mark.asyncio
    async def test_load_model_unknown_model(self, model_manager):
        """Test loading unknown model"""
        success = await model_manager.load_model("unknown-model")
        assert success is False

    @pytest.mark.asyncio
    async def test_load_model_insufficient_memory(self, model_manager):
        """Test loading model with insufficient memory"""
        model_name = "qwen3-instruct"
        
        with patch.object(model_manager, '_can_load_model', return_value=False):
            success = await model_manager.load_model(model_name)
            assert success is False

    @pytest.mark.asyncio
    async def test_load_model_mlx_error(self, model_manager):
        """Test model loading with MLX error"""
        model_name = "phi3-mini"
        
        with patch('tiered_model_manager.load', side_effect=Exception("MLX error")):
            
            success = await model_manager.load_model(model_name)
            
            assert success is False
            assert model_manager.load_failures == 1

    def test_evict_for_space_sufficient_available(self, model_manager):
        """Test eviction when sufficient space already available"""
        required_gb = 2.0
        model_manager.memory_usage_gb = 10.0  # Plenty of space available
        
        success = model_manager._evict_for_space(required_gb)
        assert success is True

    def test_evict_for_space_successful_eviction(self, model_manager):
        """Test successful eviction to make space"""
        # Fill memory
        model_manager.memory_usage_gb = model_manager.max_memory_gb - 1.0
        
        # Add some loaded models that can be evicted
        frequent_config = ModelConfig(
            id="test", name="frequent-model", ram_gb=3.0, 
            tier=ModelTier.FREQUENT, use_cases=["test"], priority="low"
        )
        frequent_model = LoadedModel(
            config=frequent_config, model=Mock(), tokenizer=Mock(),
            loaded_at=time.time(), last_used=time.time() - 100
        )
        model_manager.loaded_models["frequent-model"] = frequent_model
        
        with patch.object(model_manager, '_evict_model', return_value=True) as mock_evict:
            success = model_manager._evict_for_space(2.0)
            assert success is True
            mock_evict.assert_called()

    def test_evict_for_space_insufficient_eviction(self, model_manager):
        """Test eviction when insufficient space can be freed"""
        model_manager.memory_usage_gb = model_manager.max_memory_gb - 1.0
        
        # Add only always_on models (can't be evicted easily)
        always_on_config = ModelConfig(
            id="test", name="always-on-model", ram_gb=0.5,
            tier=ModelTier.ALWAYS_ON, use_cases=["test"], priority="critical"
        )
        always_on_model = LoadedModel(
            config=always_on_config, model=Mock(), tokenizer=Mock(),
            loaded_at=time.time(), last_used=time.time()
        )
        model_manager.loaded_models["always-on-model"] = always_on_model
        
        success = model_manager._evict_for_space(10.0)  # Require more than available
        assert success is False

    def test_get_priority_score(self, model_manager):
        """Test priority score conversion"""
        assert model_manager._get_priority_score("critical") == 4
        assert model_manager._get_priority_score("high") == 3
        assert model_manager._get_priority_score("medium") == 2
        assert model_manager._get_priority_score("low") == 1
        assert model_manager._get_priority_score("unknown") == 1  # default

    def test_evict_model_success(self, model_manager):
        """Test successful model eviction"""
        model_name = "test-model"
        config = ModelConfig(
            id="test", name=model_name, ram_gb=2.0,
            tier=ModelTier.FREQUENT, use_cases=["test"], priority="low"
        )
        loaded_model = LoadedModel(
            config=config, model=Mock(), tokenizer=Mock(),
            loaded_at=time.time(), last_used=time.time()
        )
        
        model_manager.loaded_models[model_name] = loaded_model
        model_manager.memory_usage_gb = 5.0
        
        with patch('tiered_model_manager.mx') as mock_mx:
            success = model_manager._evict_model(model_name)
            
            assert success is True
            assert model_name not in model_manager.loaded_models
            assert model_manager.memory_usage_gb == 3.0  # 5.0 - 2.0
            assert model_manager.total_evictions == 1
            mock_mx.metal.clear_cache.assert_called_once()

    def test_evict_model_not_loaded(self, model_manager):
        """Test evicting model that's not loaded"""
        success = model_manager._evict_model("nonexistent-model")
        assert success is False

    def test_evict_model_always_on_protection(self, model_manager):
        """Test that always_on models are protected from eviction"""
        model_name = "always-on-model"
        config = ModelConfig(
            id="test", name=model_name, ram_gb=1.0,
            tier=ModelTier.ALWAYS_ON, use_cases=["test"], priority="critical"
        )
        loaded_model = LoadedModel(
            config=config, model=Mock(), tokenizer=Mock(),
            loaded_at=time.time(), last_used=time.time()
        )
        
        model_manager.loaded_models[model_name] = loaded_model
        model_manager.memory_usage_gb = 5.0
        
        # Low memory pressure - should not evict always_on
        success = model_manager._evict_model(model_name)
        assert success is False
        assert model_name in model_manager.loaded_models

    def test_evict_model_always_on_critical_pressure(self, model_manager):
        """Test that always_on models can be evicted under critical pressure"""
        model_name = "always-on-model"
        config = ModelConfig(
            id="test", name=model_name, ram_gb=1.0,
            tier=ModelTier.ALWAYS_ON, use_cases=["test"], priority="critical"
        )
        loaded_model = LoadedModel(
            config=config, model=Mock(), tokenizer=Mock(),
            loaded_at=time.time(), last_used=time.time()
        )
        
        model_manager.loaded_models[model_name] = loaded_model
        # Set critical memory pressure
        model_manager.memory_usage_gb = model_manager.max_memory_gb * 0.96
        
        with patch('tiered_model_manager.mx'):
            success = model_manager._evict_model(model_name)
            assert success is True

    def test_get_loaded_model(self, model_manager):
        """Test getting loaded model instance"""
        model_name = "test-model"
        loaded_model = Mock()
        loaded_model.update_usage = Mock()
        model_manager.loaded_models[model_name] = loaded_model
        
        result = model_manager.get_loaded_model(model_name)
        
        assert result == loaded_model
        loaded_model.update_usage.assert_called_once()

    def test_get_loaded_model_not_found(self, model_manager):
        """Test getting non-existent loaded model"""
        result = model_manager.get_loaded_model("nonexistent-model")
        assert result is None

    def test_get_memory_status(self, model_manager):
        """Test memory status reporting"""
        model_manager.memory_usage_gb = 8.0
        model_manager.loaded_models = {"model1": Mock(), "model2": Mock()}
        
        status = model_manager.get_memory_status()
        
        assert status["total_memory_gb"] == 16
        assert status["used_memory_gb"] == 8.0
        assert status["available_memory_gb"] == 8.0
        assert status["memory_pressure"] == 0.5
        assert status["status"] == "normal"
        assert status["loaded_models_count"] == 2
        assert status["loaded_models"] == ["model1", "model2"]

    def test_get_memory_status_warning(self, model_manager):
        """Test memory status with warning level"""
        model_manager.memory_usage_gb = model_manager.max_memory_gb * 0.85
        
        status = model_manager.get_memory_status()
        assert status["status"] == "warning"

    def test_get_memory_status_critical(self, model_manager):
        """Test memory status with critical level"""
        model_manager.memory_usage_gb = model_manager.max_memory_gb * 0.96
        
        status = model_manager.get_memory_status()
        assert status["status"] == "critical"

    def test_get_performance_stats(self, model_manager):
        """Test performance statistics"""
        model_manager.total_loads = 10
        model_manager.total_evictions = 3
        model_manager.load_failures = 1
        
        # Add loaded models for tier breakdown
        always_on_model = Mock()
        always_on_model.config.tier = ModelTier.ALWAYS_ON
        frequent_model = Mock()
        frequent_model.config.tier = ModelTier.FREQUENT
        
        model_manager.loaded_models = {
            "always_on": always_on_model,
            "frequent": frequent_model
        }
        
        stats = model_manager.get_performance_stats()
        
        assert stats["total_loads"] == 10
        assert stats["total_evictions"] == 3
        assert stats["load_failures"] == 1
        assert stats["success_rate"] == 0.9  # (10-1)/10
        assert ModelTier.ALWAYS_ON.value in stats["models_by_tier"]
        assert "always_on" in stats["models_by_tier"][ModelTier.ALWAYS_ON.value]

    def test_list_available_models(self, model_manager):
        """Test listing available models"""
        # Add a loaded model for testing
        loaded_model = LoadedModel(
            config=model_manager.model_configs["phi3-mini"],
            model=Mock(), tokenizer=Mock(),
            loaded_at=time.time(), last_used=time.time(),
            usage_count=5
        )
        model_manager.loaded_models["phi3-mini"] = loaded_model
        
        models = model_manager.list_available_models()
        
        assert len(models) > 0
        
        # Find phi3-mini in the list
        phi3_info = next(m for m in models if m["name"] == "phi3-mini")
        assert phi3_info["is_loaded"] is True
        assert phi3_info["usage_count"] == 5
        assert phi3_info["tier"] == "always_on"
        
        # Find an unloaded model
        unloaded_models = [m for m in models if not m["is_loaded"]]
        assert len(unloaded_models) > 0
        
        # Verify sorting (by tier, then by ram_gb descending)
        tiers = [m["tier"] for m in models]
        # Should have always_on models first
        assert tiers[0] == "always_on" or tiers[1] == "always_on"


class TestTieredModelManagerIntegration:
    """Integration tests for Tiered Model Manager"""
    
    @pytest.fixture
    def model_manager(self):
        """Model manager for integration testing"""
        with patch('tiered_model_manager.asyncio.create_task'):
            return TieredMLXModelManager(max_memory_gb=32)

    @pytest.mark.asyncio
    async def test_full_model_lifecycle(self, model_manager):
        """Test complete model loading and eviction lifecycle"""
        with patch('tiered_model_manager.load') as mock_load:
             
            
            mock_load.return_value = (Mock(), Mock())
            
            # Load a model
            success = await model_manager.load_model("phi3-mini")
            assert success is True
            
            # Verify it's loaded
            loaded_model = model_manager.get_loaded_model("phi3-mini")
            assert loaded_model is not None
            
            # Check memory usage
            memory_status = model_manager.get_memory_status()
            assert memory_status["used_memory_gb"] > 0
            
            # Evict the model
            evicted = model_manager._evict_model("phi3-mini")
            assert evicted is True
            
            # Verify it's evicted
            loaded_model = model_manager.get_loaded_model("phi3-mini")
            assert loaded_model is None

    @pytest.mark.asyncio
    async def test_memory_pressure_cascade(self, model_manager):
        """Test memory pressure handling with model eviction cascade"""
        with patch('tiered_model_manager.load') as mock_load:
             
            
            mock_load.return_value = (Mock(), Mock())
            
            # Load multiple models to create memory pressure
            await model_manager.load_model("phi3-mini")
            await model_manager.load_model("mixtral")
            
            # Try to load large model requiring eviction
            with patch.object(model_manager, '_evict_for_space', return_value=True):
                success = await model_manager.load_model("qwen3-instruct")
                assert success is True

    def test_task_complexity_to_model_selection_integration(self, model_manager):
        """Test integration between task complexity and model selection"""
        test_cases = [
            ("Simple utility task", ["gemma-3-270m", "phi3-mini"]),
            ("Code generation and debugging", ["qwen3-coder"]),
            ("Image analysis task", ["qwen2.5-vl"]),
            ("Complex reasoning with long context", ["qwen3-instruct", "glm-4.5"])
        ]
        
        for task_description, expected_candidates in test_cases:
            complexity = model_manager.calculate_task_complexity(task_description)
            
            with patch.object(model_manager, '_can_load_model', return_value=True), \
                 patch.object(model_manager, 'load_model', return_value=asyncio.create_task(self._mock_async_true())):
                
                selected_model = model_manager.smart_load(task_description)
                
                if expected_candidates:
                    assert selected_model in expected_candidates, \
                        f"Task '{task_description}' selected '{selected_model}', expected one of {expected_candidates}"

    async def _mock_async_true(self):
        """Mock async function that returns True"""
        return True

    def test_tier_enforcement(self, model_manager):
        """Test that tier memory limits are enforced"""
        # Always_on tier should have small models
        always_on_models = [
            config for config in model_manager.model_configs.values()
            if config.tier == ModelTier.ALWAYS_ON
        ]
        
        for model in always_on_models:
            assert model.ram_gb <= model_manager.tier_limits[ModelTier.ALWAYS_ON] * 3  # Some flexibility

        # On_demand tier should have large models
        on_demand_models = [
            config for config in model_manager.model_configs.values()
            if config.tier == ModelTier.ON_DEMAND
        ]
        
        for model in on_demand_models:
            assert model.ram_gb > model_manager.tier_limits[ModelTier.FREQUENT]


class TestTieredModelManagerPerformance:
    """Performance tests for Tiered Model Manager"""
    
    @pytest.fixture
    def model_manager(self):
        """Model manager for performance testing"""
        with patch('tiered_model_manager.asyncio.create_task'):
            return TieredMLXModelManager()

    def test_smart_load_performance(self, model_manager):
        """Test smart_load performance meets targets"""
        task_descriptions = [
            "Simple task",
            "Code generation",
            "Image analysis", 
            "Complex reasoning"
        ] * 25  # 100 tasks total
        
        with patch.object(model_manager, '_can_load_model', return_value=True), \
             patch.object(model_manager, 'load_model', return_value=asyncio.create_task(self._mock_async_true())):
            
            start_time = time.time()
            
            for task in task_descriptions:
                model_manager.smart_load(task)
            
            end_time = time.time()
            
            avg_time_per_selection = (end_time - start_time) / len(task_descriptions)
            
            # Should be fast - under 10ms per selection
            assert avg_time_per_selection < 0.01, \
                f"Model selection too slow: {avg_time_per_selection:.4f}s per selection"

    async def _mock_async_true(self):
        """Mock async function that returns True"""
        return True

    def test_memory_calculations_performance(self, model_manager):
        """Test memory status calculations performance"""
        # Add many loaded models
        for i in range(100):
            config = ModelConfig(
                id=f"model_{i}", name=f"model_{i}", ram_gb=1.0,
                tier=ModelTier.FREQUENT, use_cases=["test"], priority="low"
            )
            loaded_model = LoadedModel(
                config=config, model=Mock(), tokenizer=Mock(),
                loaded_at=time.time(), last_used=time.time()
            )
            model_manager.loaded_models[f"model_{i}"] = loaded_model
        
        start_time = time.time()
        status = model_manager.get_memory_status()
        end_time = time.time()
        
        calculation_time = end_time - start_time
        
        # Should be fast even with many models
        assert calculation_time < 0.01, f"Memory status calculation too slow: {calculation_time:.4f}s"
        assert status["loaded_models_count"] == 100


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
