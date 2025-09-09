# Multi-stage Rust build optimized for OrbStack
FROM --platform=$BUILDPLATFORM rust:1.80-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    musl-dev \
    pkgconfig \
    openssl-dev \
    openssl-libs-static

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY Cargo.toml Cargo.lock ./

# Copy all workspace member manifests for better caching
COPY */Cargo.toml ./*/

# Create dummy source files to cache dependencies
RUN find . -name "Cargo.toml" -not -path "./Cargo.toml" | while read manifest; do \
    dir=$(dirname "$manifest"); \
    mkdir -p "$dir/src"; \
    echo "fn main() {}" > "$dir/src/main.rs"; \
    echo "" > "$dir/src/lib.rs"; \
done

# Build dependencies only
RUN cargo build --release --workspace

# Remove dummy files and copy real source
RUN find . -name "src" -type d -exec rm -rf {} + 2>/dev/null || true
COPY . .

# Build the actual application
RUN cargo build --release --workspace

# Runtime stage - minimal Alpine image
FROM alpine:3.19 AS runtime

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    tini

# Create non-root user
RUN addgroup -g 1000 cortex && \
    adduser -D -s /bin/sh -u 1000 -G cortex cortex

# Copy all release binaries from builder
COPY --from=builder /app/target/release/ /tmp/release/

# Install binaries that exist
RUN for binary in /tmp/release/*; do \
        if [ -f "$binary" ] && [ -x "$binary" ]; then \
            cp "$binary" /usr/local/bin/; \
        fi; \
    done && \
    rm -rf /tmp/release

# Set ownership and permissions for all binaries
RUN chown cortex:cortex /usr/local/bin/* && \
    chmod +x /usr/local/bin/*

# Switch to non-root user
USER cortex

# Use tini as PID 1
ENTRYPOINT ["/sbin/tini", "--"]

# Default to CLI
CMD ["codex", "--help"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD codex --version || exit 1

# Labels for OrbStack optimization
LABEL \
    org.opencontainers.image.title="Cortex Code" \
    org.opencontainers.image.description="Rust-based code analysis and generation tools" \
    org.opencontainers.image.vendor="Cortex-OS" \
    org.opencontainers.image.source="https://github.com/your-org/cortex-os" \
    orbstack.optimize="true" \
    orbstack.rosetta="false" \
    orbstack.service="cortex-code"
