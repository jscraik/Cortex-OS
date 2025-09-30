# Multi-stage Dockerfile for Cortex-OS development container
FROM node:22.12.0-bullseye as base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    wget \
    git \
    jq \
    unzip \
    zip \
    ca-certificates \
    gnupg \
    lsb-release \
    sudo \
    vim \
    nano \
    htop \
    tree \
    netcat-openbsd \
    libssl-dev \
    pkg-config \
    libpq-dev \
    python3-dev \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Docker CLI
RUN curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
RUN echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
RUN apt-get update && apt-get install -y docker-ce-cli && rm -rf /var/lib/apt/lists/*

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install mise for tool management
RUN curl https://mise.run | sh
ENV PATH="/root/.local/bin:${PATH}"
RUN mise install -y

# Python setup
RUN pip3 install --upgrade pip setuptools wheel

# Install pnpm globally
RUN npm install -g pnpm@10.4.0

# Create non-root user
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && apt-get update \
    && apt-get install -y sudo \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME \
    && rm -rf /var/lib/apt/lists/*

# Set up the user's home directory
USER $USERNAME
ENV HOME=/home/$USERNAME

# Copy mise configuration
COPY --chown=$USERNAME:$USER_GID .mise.toml $HOME/

# Initialize mise as the user
RUN mise trust && mise install -y

# Set working directory
WORKDIR /opt/cortex-home

# Development stage
FROM base as dev

# Install additional development tools
RUN npm install -g \
    @biomejs/biome \
    typescript \
    tsx \
    nodemon \
    pm2 \
    concurrently \
    npm-run-all

# Install Python development tools
RUN pip3 install --user \
    black \
    ruff \
    mypy \
    pytest \
    python-lsp-server

# Install Rust development tools
RUN cargo install \
    cargo-watch \
    cargo-edit \
    cargo-audit \
    cargo-deny

# Create necessary directories
RUN mkdir -p \
    $HOME/.config \
    $HOME/.local/share \
    $HOME/.cache \
    /opt/cortex-home/tools/agent-toolkit

# Set up git configuration
RUN git config --global init.defaultBranch main \
    && git config --global pull.rebase false

# Expose common ports
EXPOSE 3000 3001 3002 3003 3028 6333 9600 9700

# Set default command
CMD ["/bin/bash"]