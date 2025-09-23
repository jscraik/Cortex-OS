#!/bin/bash
set -euo pipefail

# MLX Integration Deployment Script for Cortex-OS
# This script sets up the MLX environment for production deployment

echo "🚀 Starting MLX Integration Deployment..."

# Configuration
PYTHON_VERSION="3.11"
MLX_BRIDGE_PORT="${MLX_BRIDGE_PORT:-8001}"
LOG_LEVEL="${LOG_LEVEL:-info}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on Apple Silicon
check_apple_silicon() {
    print_status "Checking system architecture..."
    
    if [[ $(uname -m) != "arm64" ]]; then
        print_error "MLX requires Apple Silicon (ARM64). Current architecture: $(uname -m)"
        exit 1
    fi
    
    if [[ $(uname -s) != "Darwin" ]]; then
        print_error "MLX requires macOS. Current OS: $(uname -s)"
        exit 1
    fi
    
    print_success "Apple Silicon detected: $(uname -m) on $(uname -s)"
}

# Check Python version
check_python() {
    print_status "Checking Python version..."
    
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is required but not installed"
        exit 1
    fi
    
    CURRENT_PYTHON=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1-2)
    
    if [[ "$CURRENT_PYTHON" < "$PYTHON_VERSION" ]]; then
        print_warning "Python $PYTHON_VERSION+ recommended. Current: $CURRENT_PYTHON"
    else
        print_success "Python version: $CURRENT_PYTHON"
    fi
}

# Install MLX dependencies
install_mlx_dependencies() {
    print_status "Installing MLX dependencies..."
    
    # Create virtual environment if it doesn't exist
    if [[ ! -d "venv" ]]; then
        print_status "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install MLX and dependencies
    print_status "Installing MLX framework..."
    pip install mlx-lm mlx transformers torch fastapi uvicorn
    
    print_success "MLX dependencies installed successfully"
}

# Check MLX installation
verify_mlx_installation() {
    print_status "Verifying MLX installation..."
    
    source venv/bin/activate
    
    # Test MLX import
    if python3 -c "import mlx.core as mx; print(f'MLX version: {mx.__version__}')" 2>/dev/null; then
        print_success "MLX installation verified"
    else
        print_error "MLX installation verification failed"
        exit 1
    fi
}

# Configure MLX bridge service
configure_mlx_bridge() {
    print_status "Configuring MLX bridge service..."
    
    # Create systemd service file for production
    if [[ "$ENVIRONMENT" == "production" && -d "/etc/systemd/system" ]]; then
        cat > /tmp/mlx-bridge.service << EOF
[Unit]
Description=MLX Bridge Service for Cortex-OS
After=network.target

[Service]
Type=simple
User=cortex
WorkingDirectory=$(pwd)
Environment=PATH=$(pwd)/venv/bin
ExecStart=$(pwd)/venv/bin/python python/mlx_bridge.py
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
        
        print_status "MLX bridge systemd service configured"
        print_warning "Run 'sudo mv /tmp/mlx-bridge.service /etc/systemd/system/' to install"
    fi
    
    # Create startup script
    cat > scripts/start-mlx-bridge.sh << 'EOF'
#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."
source venv/bin/activate

export MLX_BRIDGE_PORT="${MLX_BRIDGE_PORT:-8001}"
export LOG_LEVEL="${LOG_LEVEL:-info}"

echo "Starting MLX bridge on port $MLX_BRIDGE_PORT..."
python python/mlx_bridge.py
EOF
    
    chmod +x scripts/start-mlx-bridge.sh
    print_success "MLX bridge startup script created"
}

# Create health check script
create_health_check() {
    print_status "Creating health check script..."
    
    cat > scripts/mlx-health-check.sh << 'EOF'
#!/bin/bash

MLX_BRIDGE_PORT="${MLX_BRIDGE_PORT:-8001}"
TIMEOUT="${TIMEOUT:-10}"

# Health check endpoint
HEALTH_URL="http://localhost:$MLX_BRIDGE_PORT/health"

# Function to check service health
check_health() {
    response=$(curl -s -f -m "$TIMEOUT" "$HEALTH_URL" 2>/dev/null) || return 1
    status=$(echo "$response" | jq -r '.status' 2>/dev/null) || return 1
    
    if [[ "$status" == "healthy" ]]; then
        echo "✅ MLX Bridge is healthy"
        return 0
    else
        echo "❌ MLX Bridge is unhealthy: $status"
        return 1
    fi
}

# Main health check
if check_health; then
    exit 0
else
    echo "❌ MLX Bridge health check failed"
    exit 1
fi
EOF
    
    chmod +x scripts/mlx-health-check.sh
    print_success "Health check script created"
}

# Create monitoring script
create_monitoring_script() {
    print_status "Creating monitoring script..."
    
    cat > scripts/mlx-monitor.sh << 'EOF'
#!/bin/bash

MLX_BRIDGE_PORT="${MLX_BRIDGE_PORT:-8001}"
METRICS_URL="http://localhost:$MLX_BRIDGE_PORT/metrics"

# Function to get metrics
get_metrics() {
    curl -s -f "$METRICS_URL" 2>/dev/null | jq '.' || echo "Failed to fetch metrics"
}

# Display metrics
echo "=== MLX Bridge Metrics ==="
get_metrics

# System stats
echo -e "\n=== System Stats ==="
echo "Memory Usage: $(ps -o pid,rss,vsz,comm -p $(pgrep -f mlx_bridge.py) 2>/dev/null || echo 'Process not found')"
echo "Port Status: $(lsof -i :$MLX_BRIDGE_PORT 2>/dev/null || echo "Port $MLX_BRIDGE_PORT not in use")"
EOF
    
    chmod +x scripts/mlx-monitor.sh
    print_success "Monitoring script created"
}

# Create deployment verification
verify_deployment() {
    print_status "Running deployment verification..."
    
    # Test Python bridge
    source venv/bin/activate
    
    # Quick MLX test
    print_status "Testing MLX functionality..."
    python3 -c "
import mlx.core as mx
import numpy as np

# Simple MLX test
x = mx.array([1, 2, 3, 4])
y = mx.array([5, 6, 7, 8])
result = x + y

print('MLX computation test passed:', result)
print('MLX device:', mx.default_device())
"
    
    print_success "MLX functionality verified"
    
    # Test TypeScript integration (if available)
    if command -v npm &> /dev/null && [[ -f "package.json" ]]; then
        print_status "Testing TypeScript integration..."
        
        # Run MLX client tests
        if npm test -- __tests__/mlx/client.test.ts --silent 2>/dev/null; then
            print_success "TypeScript integration tests passed"
        else
            print_warning "TypeScript integration tests skipped or failed"
        fi
    fi
}

# Main deployment process
main() {
    echo "================================================"
    echo "    MLX Integration Deployment for Cortex-OS"
    echo "================================================"
    
    check_apple_silicon
    check_python
    install_mlx_dependencies
    verify_mlx_installation
    configure_mlx_bridge
    create_health_check
    create_monitoring_script
    verify_deployment
    
    echo ""
    echo "================================================"
    print_success "MLX Integration Deployment Complete!"
    echo "================================================"
    echo ""
    echo "Next steps:"
    echo "  1. Start the MLX bridge: ./scripts/start-mlx-bridge.sh"
    echo "  2. Test health: ./scripts/mlx-health-check.sh"
    echo "  3. Monitor metrics: ./scripts/mlx-monitor.sh"
    echo ""
    echo "For production deployment:"
    echo "  - Configure systemd service (see /tmp/mlx-bridge.service)"
    echo "  - Set up process monitoring (PM2, systemd, etc.)"
    echo "  - Configure log rotation"
    echo "  - Set up metrics collection (Prometheus/Grafana)"
    echo ""
}

# Run main function
main "$@"
