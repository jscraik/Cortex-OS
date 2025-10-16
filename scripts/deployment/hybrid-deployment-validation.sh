#!/bin/bash
# brAInwav Cortex-OS Hybrid Model Startup and Validation Script
# Ensures all models are available and hybrid strategy is properly configured

set -euo pipefail

# Source environment configuration
source "$(dirname "$0")/../config/hybrid.env" 2>/dev/null || true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# brAInwav branding function
log() {
    echo -e "${BLUE}brAInwav Cortex-OS:${NC} $1"
}

success() {
    echo -e "${GREEN}brAInwav Cortex-OS:${NC} ✅ $1"
}

warning() {
    echo -e "${YELLOW}brAInwav Cortex-OS:${NC} ⚠️  $1"
}

error() {
    echo -e "${RED}brAInwav Cortex-OS:${NC} ❌ $1"
}

# Configuration
MLX_URL="${MLX_BASE_URL:-http://localhost:8081}"
OLLAMA_URL="${OLLAMA_BASE_URL:-http://localhost:11434}"
MODEL_GATEWAY_URL="${MODEL_GATEWAY_URL:-http://localhost:8080}"
TIMEOUT=10

# Check if service is running
check_service() {
    local service_name=$1
    local url=$2
    local timeout=${3:-$TIMEOUT}
    
    log "Checking $service_name availability at $url..."
    
    if timeout $timeout curl -fsS "$url" >/dev/null 2>&1; then
        success "$service_name is available"
        return 0
    else
        error "$service_name is not available at $url"
        return 1
    fi
}

# Check MLX service and models
check_mlx() {
    log "🔍 Checking MLX service (Priority 100 - MLX-first principle)..."
    
    if ! check_service "MLX" "$MLX_URL/health"; then
        error "MLX service is not running. Start with: cd apps/cortex-py && uv run python serve.py --port 8081"
        return 1
    fi
    
    # Check required MLX models
    local required_models=("glm-4.5" "qwen2.5-vl" "gemma-2-2b" "smollm-135m" "gemma-3-270m" "qwen3-embedding-4b" "qwen3-reranker-4b")
    local missing_models=()
    
    log "Validating MLX models..."
    for model in "${required_models[@]}"; do
        if curl -fsS "$MLX_URL/models" 2>/dev/null | grep -q "$model"; then
            success "MLX model $model is available"
        else
            warning "MLX model $model might not be available"
            missing_models+=("$model")
        fi
    done
    
    if [ ${#missing_models[@]} -gt 0 ]; then
        warning "Some MLX models may not be available: ${missing_models[*]}"
        log "Please ensure all 7 required models are installed and accessible"
        return 1
    fi
    
    success "All MLX models validated successfully"
    return 0
}

# Check Ollama service and models
check_ollama() {
    log "🔍 Checking Ollama service..."
    
    if ! check_service "Ollama" "$OLLAMA_URL/api/tags"; then
        warning "Ollama service is not running. Install with: brew install ollama && ollama serve"
        return 1
    fi
    
    # Check local Ollama models
    local required_models=("deepseek-coder:6.7b" "qwen3-coder:30b" "gpt-oss:20b" "phi4-mini-reasoning" "gemma3n:e4b" "nomic-embed-text:v1.5" "granite-embedding:278m")
    local missing_models=()
    
    log "Validating Ollama local models..."
    if ollama list >/dev/null 2>&1; then
        for model in "${required_models[@]}"; do
            if ollama list | grep -q "$model"; then
                success "Ollama model $model is available"
            else
                warning "Ollama model $model is not installed"
                missing_models+=("$model")
            fi
        done
    else
        warning "Cannot check Ollama models - ollama CLI not available"
        return 1
    fi
    
    # Check cloud models
    log "Checking Ollama cloud models access..."
    local cloud_tags
    cloud_tags=$(curl -fsS "$OLLAMA_URL/api/tags" 2>/dev/null)

    if printf '%s' "$cloud_tags" | grep -q "480b-cloud" && printf '%s' "$cloud_tags" | grep -q "glm-4.6:cloud"; then
        success "Ollama cloud models are accessible"
    else
        log "Cloud models may require signin: ollama signin"
    fi
    
    if [ ${#missing_models[@]} -gt 0 ]; then
        warning "Missing Ollama models: ${missing_models[*]}"
        log "Install with: ollama pull <model_name>"
    fi
    
    return 0
}

# Check Model Gateway
check_model_gateway() {
    log "🔍 Checking Model Gateway (Hybrid Router)..."
    
    if ! check_service "Model Gateway" "$MODEL_GATEWAY_URL/health"; then
        error "Model Gateway is not running"
        log "Start with: cd packages/model-gateway && npm start"
        return 1
    fi
    
    # Check hybrid routing configuration
    if curl -fsS "$MODEL_GATEWAY_URL/config" 2>/dev/null | grep -q "hybrid"; then
        success "Hybrid routing is configured"
    else
        warning "Hybrid routing configuration not detected"
    fi
    
    return 0
}

# Validate hybrid configuration
validate_hybrid_config() {
    log "🔍 Validating hybrid configuration..."
    
    local config_files=(
        "../config/hybrid-model-enforcement.json"
        "../config/hybrid-model-strategy.json" 
        "../config/mlx-models.json"
        "../config/ollama-models.json"
        "../config/hybrid.env"
    )
    
    for config_file in "${config_files[@]}"; do
        if [ -f "$config_file" ]; then
            success "Configuration file exists: $(basename "$config_file")"
        else
            error "Missing configuration file: $config_file"
            return 1
        fi
    done
    
    # Validate orchestration package
    local orchestration_config="../packages/orchestration/src/config/hybrid-model-integration.ts"
    if [ -f "$orchestration_config" ]; then
        success "Orchestration hybrid integration is configured"
    else
        error "Missing orchestration hybrid integration"
        return 1
    fi
    
    return 0
}

# Test hybrid routing
test_hybrid_routing() {
    log "🧪 Testing hybrid routing functionality..."
    
    # Test embedding endpoint
    if curl -fsS -X POST "$MODEL_GATEWAY_URL/embeddings" \
        -H "Content-Type: application/json" \
        -d '{"texts":["test"],"model":"qwen3-embedding-4b"}' >/dev/null 2>&1; then
        success "Embedding endpoint is working"
    else
        warning "Embedding endpoint test failed"
    fi
    
    # Test chat endpoint  
    if curl -fsS -X POST "$MODEL_GATEWAY_URL/chat" \
        -H "Content-Type: application/json" \
        -d '{"messages":[{"role":"user","content":"Hello"}],"model":"glm-4.5"}' >/dev/null 2>&1; then
        success "Chat endpoint is working"
    else
        warning "Chat endpoint test failed"
    fi
    
    return 0
}

# Performance validation
validate_performance() {
    log "⚡ Validating performance configuration..."
    
    local start_time=$(date +%s%N)
    
    # Test ultra-fast tier
    if curl -fsS -X POST "$MODEL_GATEWAY_URL/chat" \
        -H "Content-Type: application/json" \
        -d '{"messages":[{"role":"user","content":"Quick test"}],"model":"gemma-3-270m"}' >/dev/null 2>&1; then
        local end_time=$(date +%s%N)
        local duration_ms=$(( (end_time - start_time) / 1000000 ))
        
        if [ $duration_ms -lt 500 ]; then
            success "Ultra-fast tier performance validated ($duration_ms ms)"
        else
            warning "Ultra-fast tier slower than expected ($duration_ms ms > 500ms)"
        fi
    else
        warning "Ultra-fast tier performance test failed"
    fi
    
    return 0
}

# Generate deployment report
generate_report() {
    log "📋 Generating hybrid deployment report..."
    
    local report_file="../config/hybrid-deployment-report.md"
    
    cat > "$report_file" << EOF
# brAInwav Cortex-OS Hybrid Model Deployment Report

Generated: $(date)
Author: brAInwav Development Team

## Deployment Status

### MLX Service (Priority 100)
- Status: $(check_service "MLX" "$MLX_URL/health" >/dev/null 2>&1 && echo "✅ Running" || echo "❌ Not Running")
- URL: $MLX_URL
- Required Models: 7 (glm-4.5, qwen2.5-vl, gemma-2-2b, smollm-135m, gemma-3-270m, qwen3-embedding-4b, qwen3-reranker-4b)

### Ollama Service  
- Status: $(check_service "Ollama" "$OLLAMA_URL/api/tags" >/dev/null 2>&1 && echo "✅ Running" || echo "❌ Not Running")
- URL: $OLLAMA_URL
- Cloud Access: $(curl -fsS "$OLLAMA_URL/api/tags" 2>/dev/null | grep -q "480b-cloud" && echo "✅ Available" || echo "⚠️  Requires signin")

### Model Gateway
- Status: $(check_service "Model Gateway" "$MODEL_GATEWAY_URL/health" >/dev/null 2>&1 && echo "✅ Running" || echo "❌ Not Running")
- URL: $MODEL_GATEWAY_URL
- Hybrid Routing: $(curl -fsS "$MODEL_GATEWAY_URL/config" 2>/dev/null | grep -q "hybrid" && echo "✅ Configured" || echo "⚠️  Not detected")

### Hybrid Configuration
- Enforcement Config: $([ -f "../config/hybrid-model-enforcement.json" ] && echo "✅ Present" || echo "❌ Missing")
- Strategy Config: $([ -f "../config/hybrid-model-strategy.json" ] && echo "✅ Present" || echo "❌ Missing")
- Environment Config: $([ -f "../config/hybrid.env" ] && echo "✅ Present" || echo "❌ Missing")
- Orchestration Integration: $([ -f "../packages/orchestration/src/config/hybrid-model-integration.ts" ] && echo "✅ Present" || echo "❌ Missing")

## Hybrid Strategy Summary

- **MLX-First Priority**: 100 (Highest)
- **Privacy Mode**: ${CORTEX_PRIVACY_MODE:-false}
- **Conjunction Enabled**: ${CORTEX_CONJUNCTION_ENABLED:-true}
- **Parallel Verification**: ${CORTEX_PARALLEL_VERIFICATION:-true}
- **Sequential Enhancement**: ${CORTEX_SEQUENTIAL_ENHANCEMENT:-true}
- **Specialized Delegation**: ${CORTEX_SPECIALIZED_DELEGATION:-true}

## Performance Tiers

- **Ultra Fast**: gemma-3-270m, smollm-135m (< 500ms)
- **Balanced**: gemma-2-2b, qwen2.5-vl (< 2000ms)  
- **High Performance**: glm-4.5 (< 5000ms)

## Deployment Recommendations

1. Ensure all MLX models are downloaded and accessible
2. Configure Ollama cloud access with \`ollama signin\`
3. Verify Model Gateway hybrid routing configuration
4. Run performance validation tests
5. Monitor hybrid routing metrics

---
*Co-authored-by: brAInwav Development Team*
EOF

    success "Deployment report generated: $report_file"
}

# Main execution
main() {
    log "🚀 Starting brAInwav Cortex-OS Hybrid Model Deployment Validation"
    log "=============================================="
    
    local exit_code=0
    
    # Run all checks
    check_mlx || exit_code=1
    echo
    
    check_ollama || warning "Ollama checks failed, but not critical for MLX-first operation"
    echo
    
    check_model_gateway || exit_code=1
    echo
    
    validate_hybrid_config || exit_code=1
    echo
    
    test_hybrid_routing || warning "Some routing tests failed"
    echo
    
    validate_performance || warning "Performance validation had issues"
    echo
    
    generate_report
    echo
    
    if [ $exit_code -eq 0 ]; then
        success "🎉 brAInwav Cortex-OS Hybrid Model Deployment is ready!"
        log "All critical components are validated and operational"
        log "MLX-first routing with Ollama Cloud conjunction is active"
    else
        error "🚨 Deployment validation failed"
        log "Please address the issues above before proceeding"
        log "Check the deployment report for detailed status"
    fi
    
    log "=============================================="
    exit $exit_code
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
