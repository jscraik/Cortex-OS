# Hugging Face Cache Configuration

## Overview

The Cortex-OS system uses Hugging Face models for various AI operations. To ensure efficient model loading and avoid repeated downloads, the system is configured to use persistent cache directories.

## Environment Variables

### Required Configuration

Set the following environment variable in your `.env` file:

```bash
# Hugging Face cache directory (for Docker deployments)
# Should point to external SSD for model persistence
HUGGINGFACE_CACHE_DIR=/Volumes/ExternalSSD/huggingface_cache
```

### Related Variables

The system also supports these Hugging Face cache variables:

```bash
# Standard Hugging Face environment variables
HF_HOME=/Volumes/ExternalSSD/huggingface_cache
HF_HUB_CACHE=/Volumes/ExternalSSD/huggingface_cache
HUGGINGFACE_HUB_CACHE=/Volumes/ExternalSSD/huggingface_cache

# MLX-specific cache (for Apple Silicon)
MLX_CACHE_DIR=/Volumes/ExternalSSD/huggingface_cache
```

## Docker Integration

### Automatic Volume Mounting

When you set `HUGGINGFACE_CACHE_DIR`, the Docker Compose configurations automatically mount this directory into containers that need access to Hugging Face models:

- **Ollama services**: Models cached at `/app/huggingface_cache` inside containers
- **ML Inference services**: Development, production, and GPU-enabled variants
- **Python MLX services**: For Apple Silicon acceleration

### Benefits

1. **Persistence**: Models persist across container restarts
2. **Performance**: No need to re-download models on container rebuild
3. **Storage Efficiency**: Shared cache across all services
4. **External Storage**: Models stored on fast external SSD

## Usage Examples

### 1. Set Environment Variable

Create or update your `.env` file:

```bash
# Copy from template
cp .env.example .env

# Edit to set your cache directory
echo "HUGGINGFACE_CACHE_DIR=/Volumes/ExternalSSD/huggingface_cache" >> .env
```

### 2. Pre-download Models

Download models to the cache before running containers:

```bash
# Set cache directory
export HUGGINGFACE_CACHE_DIR=/Volumes/ExternalSSD/huggingface_cache

# Download embedding models
huggingface-cli download Qwen/Qwen3-Embedding-0.6B --cache-dir $HUGGINGFACE_CACHE_DIR
huggingface-cli download Qwen/Qwen3-Embedding-4B --cache-dir $HUGGINGFACE_CACHE_DIR
huggingface-cli download Qwen/Qwen3-Embedding-8B --cache-dir $HUGGINGFACE_CACHE_DIR
```

### 3. Start Services

Run Docker Compose with the cache configuration:

```bash
# Start main services
docker-compose up -d

# Start ML inference services
cd services/ml-inference
docker-compose up -d
```

## Verification

### Check Container Mounts

Verify that containers have access to the cache:

```bash
# Check Ollama container
docker exec -it cortex-os-ollama-1 ls -la /app/huggingface_cache

# Check ML inference container
docker exec -it ml-inference-ml-inference-dev-1 ls -la /app/huggingface_cache
```

### Monitor Cache Usage

Check cache directory on host:

```bash
# View cache contents
ls -la /Volumes/ExternalSSD/huggingface_cache/

# Check cache size
du -sh /Volumes/ExternalSSD/huggingface_cache/
```

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure the cache directory is writable by Docker
2. **Missing Directory**: Create the cache directory if it doesn't exist
3. **Path Issues**: Use absolute paths in environment variables

### Solutions

```bash
# Create and set permissions
sudo mkdir -p /Volumes/ExternalSSD/huggingface_cache
sudo chown -R $(whoami):$(id -gn) /Volumes/ExternalSSD/huggingface_cache
sudo chmod -R 755 /Volumes/ExternalSSD/huggingface_cache

# Test access
echo "test" > /Volumes/ExternalSSD/huggingface_cache/test.txt
cat /Volumes/ExternalSSD/huggingface_cache/test.txt
rm /Volumes/ExternalSSD/huggingface_cache/test.txt
```

## Best Practices

1. **Use External Storage**: Store cache on fast external SSD for better performance
2. **Monitor Size**: Hugging Face caches can grow large; monitor disk usage
3. **Backup Important Models**: Consider backing up frequently used models
4. **Clean Old Models**: Periodically clean unused model versions
5. **Set Consistent Paths**: Use the same cache path across all environments

---

**Note**: This configuration is part of the brAInwav Cortex-OS containerization strategy to ensure no absolute host paths remain in configuration files while maintaining efficient model storage.
