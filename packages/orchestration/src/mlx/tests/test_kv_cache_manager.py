#!/usr/bin/env python3
"""
Comprehensive test suite for KV Cache Manager

Tests cover:
- Prompt caching and retrieval
- Rotating cache functionality  
- Memory cleanup operations
- Performance benchmarking for cache hits/misses
- Mock MLX integration for environments without MLX
"""

import asyncio
import json
import pytest
pytest.importorskip("mlx")
import tempfile
import time
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch, mock_open
from typing import Dict, Any

# Import the module under test
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from kv_cache_manager import (
    AdvancedKVCacheManager, 
    DEFAULT_SYSTEM_PROMPTS
)


class TestAdvancedKVCacheManager:
    """Test suite for AdvancedKVCacheManager"""
    
    @pytest.fixture
    def temp_cache_dir(self):
        """Create temporary cache directory for testing"""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield temp_dir
    
    @pytest.fixture
    def cache_manager(self, temp_cache_dir):
        """Create cache manager instance with temp directory"""
        return AdvancedKVCacheManager(cache_dir=temp_cache_dir)
    
    @pytest.fixture
    def mock_model_and_tokenizer(self):
        """Mock MLX model and tokenizer"""
        model = Mock()
        tokenizer = Mock()
        return model, tokenizer

    def test_initialization(self, cache_manager, temp_cache_dir):
        """Test cache manager initialization"""
        assert cache_manager.rotating_cache_size == 4096
        assert cache_manager.prompt_cache_dir == Path(temp_cache_dir)
        assert cache_manager.prompt_cache_dir.exists()
        assert cache_manager.cached_prompts == {}
        assert cache_manager.cache_metadata == {}
        assert cache_manager.cache_hits == 0
        assert cache_manager.cache_misses == 0
        assert cache_manager.max_memory_cache_items == 50
    
    def test_initialization_custom_cache_dir(self):
        """Test initialization with custom cache directory"""
        with tempfile.TemporaryDirectory() as temp_dir:
            custom_dir = os.path.join(temp_dir, "custom_cache")
            manager = AdvancedKVCacheManager(cache_dir=custom_dir)
            assert manager.prompt_cache_dir == Path(custom_dir)
            assert manager.prompt_cache_dir.exists()

    def test_generate_with_cache_no_cache_key(self, cache_manager):
        """Test generation without cache key"""
        with patch('kv_cache_manager.generate') as mock_generate:
            mock_generate.return_value = "Generated response"
            
            model, tokenizer = Mock(), Mock()
            prompt = "Test prompt"
            
            response = cache_manager.generate_with_cache(model, tokenizer, prompt)
            
            assert response == "Generated response"
            assert cache_manager.cache_misses == 1
            mock_generate.assert_called_once()

    def test_generate_with_cache_with_cache_key(self, cache_manager):
        """Test generation with cache key (cache miss then hit)"""
        with patch('kv_cache_manager.generate') as mock_generate:
            mock_generate.return_value = "Generated response"
            
            model, tokenizer = Mock(), Mock()
            prompt = "Test prompt"
            cache_key = "test_cache"
            
            # First call - cache miss
            response1 = cache_manager.generate_with_cache(
                model, tokenizer, prompt, cache_key=cache_key
            )
            assert response1 == "Generated response"
            assert cache_manager.cache_misses == 1
            assert cache_manager.cache_hits == 0
            
            # Add to cache manually for testing
            cache_manager.cached_prompts[cache_key] = "Cached prompt content"
            
            # Second call - cache hit
            response2 = cache_manager.generate_with_cache(
                model, tokenizer, prompt, cache_key=cache_key
            )
            assert response2 == "Generated response"
            assert cache_manager.cache_hits == 1
            assert cache_manager.cache_misses == 1

    def test_generate_with_cache_custom_params(self, cache_manager):
        """Test generation with custom parameters"""
        with patch('kv_cache_manager.generate') as mock_generate:
            mock_generate.return_value = "Custom response"
            
            model, tokenizer = Mock(), Mock()
            prompt = "Test prompt"
            
            response = cache_manager.generate_with_cache(
                model, tokenizer, prompt,
                max_tokens=1024,
                temperature=0.5,
                custom_param="test"
            )
            
            assert response == "Custom response"
            # Verify custom parameters were passed
            call_args = mock_generate.call_args
            assert call_args[1]['max_tokens'] == 1024
            assert call_args[1]['temperature'] == 0.5
            assert call_args[1]['custom_param'] == "test"

    def test_cache_system_prompt_success(self, cache_manager):
        """Test successful system prompt caching"""
        with patch('kv_cache_manager.load') as mock_load, \
             patch('kv_cache_manager.cache_prompt') as mock_cache_prompt:
            mock_load.return_value = (Mock(), Mock())

            result = cache_manager.cache_system_prompt(
                'test-model', 'System prompt content', 'test_cache'
            )

            assert result is True
            assert 'test_cache' in cache_manager.cached_prompts
            assert cache_manager.cached_prompts['test_cache'] == 'System prompt content'
            assert 'test_cache' in cache_manager.cache_metadata

            metadata = cache_manager.cache_metadata['test_cache']
            assert metadata['model_id'] == 'test-model'
            assert 'cached_at' in metadata
            assert 'cache_time' in metadata
            assert metadata['prompt_length'] == len('System prompt content')

    def test_cache_system_prompt_failure(self, cache_manager):
        """Test system prompt caching failure"""
        with patch('kv_cache_manager.load', side_effect=Exception('Load failed')):
            result = cache_manager.cache_system_prompt(
                'test-model', 'System prompt', 'test_cache'
            )
            
            assert result is False
            assert "test_cache" not in cache_manager.cached_prompts

    def test_load_cached_prompt_memory_hit(self, cache_manager):
        """Test loading cached prompt from memory"""
        # Add prompt to memory cache
        test_prompt = "Cached prompt content"
        cache_manager.cached_prompts["test_cache"] = test_prompt
        
        result = cache_manager.load_cached_prompt("test_cache")
        
        assert result == test_prompt
        assert cache_manager.cache_hits == 1

    def test_load_cached_prompt_file_not_found(self, cache_manager):
        """Test loading non-existent cached prompt"""
        result = cache_manager.load_cached_prompt("nonexistent_cache")
        assert result is None

    def test_load_cached_prompt_from_metadata(self, cache_manager, temp_cache_dir):
        """Test loading cached prompt from metadata file"""
        # Create metadata file
        metadata_path = Path(temp_cache_dir) / "test_cache.json"
        metadata = {
            "prompt_text": "Metadata prompt content",
            "model_id": "test-model"
        }
        
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f)
        
        # Create corresponding safetensors file
        cache_path = Path(temp_cache_dir) / "test_cache.safetensors"
        cache_path.touch()
        
        result = cache_manager.load_cached_prompt("test_cache")
        
        assert result == "Metadata prompt content"
        assert cache_manager.cache_hits == 1
        assert "test_cache" in cache_manager.cached_prompts

    def test_load_cached_prompt_metadata_error(self, cache_manager, temp_cache_dir):
        """Test loading cached prompt with corrupted metadata"""
        # Create corrupted metadata file
        metadata_path = Path(temp_cache_dir) / "test_cache.json"
        with open(metadata_path, 'w') as f:
            f.write("invalid json content")
        
        # Create corresponding safetensors file
        cache_path = Path(temp_cache_dir) / "test_cache.safetensors"
        cache_path.touch()
        
        result = cache_manager.load_cached_prompt("test_cache")
        assert result is None

    def test_clear_memory_cache(self, cache_manager):
        """Test memory cache clearing"""
        with patch('kv_cache_manager.mx') as mock_mx:
            cache_manager.clear_memory_cache()
            mock_mx.metal.clear_cache.assert_called_once()

    def test_cleanup_memory_cache_under_limit(self, cache_manager):
        """Test memory cache cleanup when under limit"""
        # Add items under the limit
        for i in range(cache_manager.max_memory_cache_items - 10):
            cache_manager.cached_prompts[f"cache_{i}"] = f"content_{i}"
            cache_manager.cache_metadata[f"cache_{i}"] = {"last_used": time.time()}
        
        initial_count = len(cache_manager.cached_prompts)
        cache_manager._cleanup_memory_cache()
        
        # Should not remove any items
        assert len(cache_manager.cached_prompts) == initial_count

    def test_cleanup_memory_cache_over_limit(self, cache_manager):
        """Test memory cache cleanup when over limit"""
        # Add items over the limit with different last_used times
        base_time = time.time()
        for i in range(cache_manager.max_memory_cache_items + 10):
            cache_manager.cached_prompts[f"cache_{i}"] = f"content_{i}"
            cache_manager.cache_metadata[f"cache_{i}"] = {
                "last_used": base_time - (100 - i)  # Older items have smaller timestamps
            }
        
        cache_manager._cleanup_memory_cache()
        
        # Should keep only max_memory_cache_items
        assert len(cache_manager.cached_prompts) == cache_manager.max_memory_cache_items
        
        # Should keep the most recently used items
        remaining_keys = set(cache_manager.cached_prompts.keys())
        expected_keys = {f"cache_{i}" for i in range(10, cache_manager.max_memory_cache_items + 10)}
        assert remaining_keys == expected_keys

    def test_get_cache_stats(self, cache_manager):
        """Test cache statistics retrieval"""
        # Set up some test data
        cache_manager.cache_hits = 15
        cache_manager.cache_misses = 5
        cache_manager.cached_prompts = {"test1": "content1", "test2": "content2"}
        
        stats = cache_manager.get_cache_stats()
        
        assert stats["cache_hits"] == 15
        assert stats["cache_misses"] == 5
        assert stats["total_requests"] == 20
        assert stats["hit_rate"] == 0.75  # 15/20
        assert stats["cached_prompts_count"] == 2
        assert stats["rotating_cache_size"] == 4096
        assert stats["memory_cache_limit"] == 50

    def test_get_cache_stats_no_requests(self, cache_manager):
        """Test cache statistics with no requests"""
        stats = cache_manager.get_cache_stats()
        
        assert stats["cache_hits"] == 0
        assert stats["cache_misses"] == 0
        assert stats["total_requests"] == 0
        assert stats["hit_rate"] == 0
        assert stats["cached_prompts_count"] == 0

    def test_list_cached_prompts_empty(self, cache_manager):
        """Test listing cached prompts when none exist"""
        cached_info = cache_manager.list_cached_prompts()
        assert cached_info == []

    def test_list_cached_prompts_with_files(self, cache_manager, temp_cache_dir):
        """Test listing cached prompts with existing files"""
        # Create test cache files
        cache_file1 = Path(temp_cache_dir) / "cache1.safetensors"
        cache_file2 = Path(temp_cache_dir) / "cache2.safetensors"
        
        # Write some content to make files have size
        cache_file1.write_text("dummy content")
        cache_file2.write_text("dummy content 2")
        
        # Add metadata
        cache_manager.cache_metadata["cache1"] = {
            "model_id": "model1",
            "prompt_length": 100,
            "last_used": time.time()
        }
        cache_manager.cache_metadata["cache2"] = {
            "model_id": "model2", 
            "prompt_length": 200,
            "last_used": time.time() - 100
        }
        
        cached_info = cache_manager.list_cached_prompts()
        
        assert len(cached_info) == 2
        assert cached_info[0]["cache_key"] in ["cache1", "cache2"]
        assert "file_path" in cached_info[0]
        assert "file_size" in cached_info[0]
        assert "model_id" in cached_info[0]
        
        # Should be sorted by last_used (most recent first)
        assert cached_info[0]["last_used"] >= cached_info[1]["last_used"]

    @pytest.mark.asyncio
    async def test_warm_cache(self, cache_manager):
        """Test cache warming functionality"""
        system_prompts = {
            "prompt1": "System prompt 1 content",
            "prompt2": "System prompt 2 content"
        }
        
        with patch.object(cache_manager, 'cache_system_prompt') as mock_cache:
            mock_cache.return_value = True
            
            await cache_manager.warm_cache(system_prompts, "test-model")
            
            assert mock_cache.call_count == 2
            mock_cache.assert_any_call("test-model", "System prompt 1 content", "prompt1")
            mock_cache.assert_any_call("test-model", "System prompt 2 content", "prompt2")

    @pytest.mark.asyncio
    async def test_warm_cache_with_failures(self, cache_manager):
        """Test cache warming with some failures"""
        system_prompts = {
            "prompt1": "System prompt 1 content",
            "prompt2": "System prompt 2 content"
        }
        
        with patch.object(cache_manager, 'cache_system_prompt') as mock_cache:
            # First call succeeds, second fails
            mock_cache.side_effect = [True, False]
            
            await cache_manager.warm_cache(system_prompts, "test-model")
            
            assert mock_cache.call_count == 2

    def test_cleanup_cache_directory_no_old_files(self, cache_manager, temp_cache_dir):
        """Test cache directory cleanup with no old files"""
        # Create recent cache file
        cache_file = Path(temp_cache_dir) / "recent_cache.safetensors"
        cache_file.write_text("content")
        
        initial_files = list(Path(temp_cache_dir).glob("*.safetensors"))
        cache_manager.cleanup_cache_directory(max_age_days=1)
        final_files = list(Path(temp_cache_dir).glob("*.safetensors"))
        
        assert len(initial_files) == len(final_files)

    def test_cleanup_cache_directory_with_old_files(self, cache_manager, temp_cache_dir):
        """Test cache directory cleanup with old files"""
        # Create old cache file
        cache_file = Path(temp_cache_dir) / "old_cache.safetensors"
        cache_file.write_text("content")
        
        # Create corresponding metadata file
        metadata_file = Path(temp_cache_dir) / "old_cache.json"
        metadata_file.write_text('{"test": "data"}')
        
        # Modify file times to make them old
        old_time = time.time() - (31 * 24 * 60 * 60)  # 31 days ago
        os.utime(cache_file, (old_time, old_time))
        os.utime(metadata_file, (old_time, old_time))
        
        # Add to memory cache
        cache_manager.cached_prompts["old_cache"] = "content"
        cache_manager.cache_metadata["old_cache"] = {"test": "data"}
        
        cache_manager.cleanup_cache_directory(max_age_days=30)
        
        # Files should be removed
        assert not cache_file.exists()
        assert not metadata_file.exists()
        
        # Memory cache should be cleaned
        assert "old_cache" not in cache_manager.cached_prompts
        assert "old_cache" not in cache_manager.cache_metadata

    def test_cleanup_cache_directory_removal_error(self, cache_manager, temp_cache_dir):
        """Test cache directory cleanup with file removal error"""
        cache_file = Path(temp_cache_dir) / "error_cache.safetensors"
        cache_file.write_text("content")
        
        # Make file old
        old_time = time.time() - (31 * 24 * 60 * 60)
        os.utime(cache_file, (old_time, old_time))
        
        with patch.object(Path, 'unlink', side_effect=PermissionError("Cannot delete")):
            # Should not raise exception
            cache_manager.cleanup_cache_directory(max_age_days=30)

    def test_default_system_prompts_structure(self):
        """Test default system prompts have correct structure"""
        assert isinstance(DEFAULT_SYSTEM_PROMPTS, dict)
        assert "code_review" in DEFAULT_SYSTEM_PROMPTS
        assert "planning" in DEFAULT_SYSTEM_PROMPTS
        assert "coordination" in DEFAULT_SYSTEM_PROMPTS
        
        for key, prompt in DEFAULT_SYSTEM_PROMPTS.items():
            assert isinstance(prompt, str)
            assert len(prompt) > 100  # Substantial prompts
            assert "You are" in prompt  # Should be persona-based

    def test_performance_tracking(self, cache_manager):
        """Test performance metrics tracking"""
        initial_hits = cache_manager.cache_hits
        initial_misses = cache_manager.cache_misses
        
        # Simulate cache operations
        cache_manager.cached_prompts["test"] = "content"
        
        # Load from cache (hit)
        result = cache_manager.load_cached_prompt("test")
        assert result == "content"
        assert cache_manager.cache_hits == initial_hits + 1
        
        # Load non-existent (miss)
        result = cache_manager.load_cached_prompt("nonexistent")
        assert result is None
        # Cache miss count should remain same for load operations
        assert cache_manager.cache_misses == initial_misses

    def test_concurrent_access_safety(self, cache_manager):
        """Test thread safety of cache operations"""
        import threading
        import time
        
        def cache_operation(cache_key: str):
            cache_manager.cached_prompts[cache_key] = f"content_{cache_key}"
            time.sleep(0.001)  # Small delay to increase chance of race conditions
            result = cache_manager.load_cached_prompt(cache_key)
            assert result == f"content_{cache_key}"
        
        # Run multiple operations concurrently
        threads = []
        for i in range(10):
            thread = threading.Thread(target=cache_operation, args=(f"cache_{i}",))
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        # Verify all operations completed successfully
        assert len(cache_manager.cached_prompts) == 10
        assert cache_manager.cache_hits == 10

    def test_memory_pressure_simulation(self, cache_manager):
        """Test behavior under memory pressure"""
        # Fill cache beyond normal capacity
        large_content = "x" * 10000  # Large content
        
        for i in range(100):  # More than max_memory_cache_items
            cache_manager.cached_prompts[f"large_cache_{i}"] = large_content
            cache_manager.cache_metadata[f"large_cache_{i}"] = {
                "last_used": time.time() - i,  # Decreasing timestamps
                "prompt_length": len(large_content)
            }
        
        # Trigger cleanup
        cache_manager._cleanup_memory_cache()
        
        # Should maintain size limit
        assert len(cache_manager.cached_prompts) <= cache_manager.max_memory_cache_items


class TestKVCacheManagerPerformance:
    """Performance tests for KV Cache Manager"""
    
    @pytest.fixture
    def cache_manager(self):
        """Cache manager for performance testing"""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield AdvancedKVCacheManager(cache_dir=temp_dir)
    
    def test_cache_hit_performance(self, cache_manager):
        """Test cache hit performance meets targets"""
        # Pre-populate cache
        for i in range(100):
            cache_manager.cached_prompts[f"cache_{i}"] = f"content_{i}"
        
        # Measure cache hit performance
        start_time = time.time()
        for i in range(100):
            result = cache_manager.load_cached_prompt(f"cache_{i}")
            assert result == f"content_{i}"
        end_time = time.time()
        
        avg_time_per_hit = (end_time - start_time) / 100
        
        # Should be very fast - under 1ms per hit
        assert avg_time_per_hit < 0.001, f"Cache hit too slow: {avg_time_per_hit:.4f}s"

    def test_cache_stats_performance(self, cache_manager):
        """Test cache statistics calculation performance"""
        # Pre-populate with substantial data
        for i in range(1000):
            cache_manager.cached_prompts[f"cache_{i}"] = f"content_{i}"
            cache_manager.cache_metadata[f"cache_{i}"] = {
                "last_used": time.time(),
                "prompt_length": 100
            }
        
        cache_manager.cache_hits = 5000
        cache_manager.cache_misses = 1000
        
        # Measure stats calculation performance
        start_time = time.time()
        stats = cache_manager.get_cache_stats()
        end_time = time.time()
        
        calculation_time = end_time - start_time
        
        # Stats calculation should be fast
        assert calculation_time < 0.01, f"Stats calculation too slow: {calculation_time:.4f}s"
        assert stats["cached_prompts_count"] == 1000
        assert stats["hit_rate"] == 5000 / 6000

    @pytest.mark.asyncio
    async def test_cache_warming_performance(self, cache_manager):
        """Test cache warming performance"""
        large_prompts = {
            f"prompt_{i}": "x" * 1000 for i in range(10)  # 10 large prompts
        }
        
        with patch.object(cache_manager, 'cache_system_prompt') as mock_cache:
            mock_cache.return_value = True
            
            start_time = time.time()
            await cache_manager.warm_cache(large_prompts, "test-model")
            end_time = time.time()
            
            warming_time = end_time - start_time
            
            # Cache warming should complete quickly
            assert warming_time < 5.0, f"Cache warming too slow: {warming_time:.2f}s"
            assert mock_cache.call_count == 10


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
