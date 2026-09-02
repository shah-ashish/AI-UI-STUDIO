#!/usr/bin/env bash
# ==============================================================================
# Script: setup_ollama.sh
# Purpose:
#   1. Install zstd & download Ollama using .tar.zst
#   2. Start the Ollama server in the background
#   3. Pull specified model(s) (e.g., deepseek-r1, deepseek-coder)
#   4. Install Cloudflare tunnel (cloudflared)
#   5. Expose the Ollama instance publicly via Cloudflare Quick Tunnel
# ==============================================================================

set -e

# Configuration / Defaults (can be overridden via env vars or arguments)
MODEL_NAME="${1:-deepseek-r1}"
OLLAMA_PORT="${OLLAMA_PORT:-11434}"
OLLAMA_LOG="/tmp/ollama.log"
CLOUDFLARE_LOG="/tmp/cloudflared.log"

echo "======================================================"
echo " Starting Ollama & Cloudflare Tunnel Setup"
echo " Model to pull: $MODEL_NAME"
echo " Ollama port  : $OLLAMA_PORT"
echo "======================================================"

# Determine sudo requirement
SUDO=""
if [ "$(id -u)" -ne 0 ] && command -v sudo &>/dev/null; then
    SUDO="sudo"
fi

# 1. Install zstd and curl if not present
echo "==> [1/5] Checking dependencies (zstd, curl)..."
if ! command -v zstd &>/dev/null || ! command -v curl &>/dev/null; then
    echo "Installing zstd and curl..."
    if command -v apt-get &>/dev/null; then
        $SUDO apt-get update -qq && $SUDO apt-get install -y -qq zstd curl
    elif command -v dnf &>/dev/null; then
        $SUDO dnf install -y zstd curl
    elif command -v pacman &>/dev/null; then
        $SUDO pacman -Sy --noconfirm zstd curl
    else
        echo "Warning: Package manager not recognized. Ensure zstd and curl are installed."
    fi
fi

# 2. Download and extract Ollama using zstd
echo "==> [2/5] Downloading and extracting Ollama (.tar.zst)..."
if ! command -v ollama &>/dev/null; then
    curl -fsSL https://ollama.com/download/ollama-linux-amd64.tar.zst | $SUDO tar --zstd -xvf - -C /usr/local
    export PATH="/usr/local/bin:$PATH"
    echo "Ollama installed successfully: $(ollama --version 2>/dev/null || echo 'installed')"
else
    echo "Ollama is already installed: $(ollama --version)"
fi

# 3. Start Ollama server in the background
echo "==> [3/5] Starting Ollama server..."
export OLLAMA_HOST="0.0.0.0:${OLLAMA_PORT}"

# Stop any existing ollama serve processes if running
pkill -f "ollama serve" || true
sleep 1

nohup ollama serve > "$OLLAMA_LOG" 2>&1 &
OLLAMA_PID=$!
echo "Ollama daemon started (PID: $OLLAMA_PID). Waiting for API..."

# Wait until Ollama API responds
MAX_TRIES=30
TRIES=0
until curl -s "http://localhost:${OLLAMA_PORT}/" > /dev/null; do
    sleep 1
    TRIES=$((TRIES + 1))
    if [ "$TRIES" -ge "$MAX_TRIES" ]; then
        echo "Error: Ollama server failed to respond within $MAX_TRIES seconds."
        echo "Check log: $OLLAMA_LOG"
        cat "$OLLAMA_LOG"
        exit 1
    fi
done
echo "Ollama server is active and listening on port ${OLLAMA_PORT}."

# 4. Pull the requested model
echo "==> [4/5] Pulling model: ${MODEL_NAME}..."
ollama pull "$MODEL_NAME"

# Pull secondary coding model if passed as second argument
if [ -n "$2" ]; then
    echo "==> Pulling second model: $2..."
    ollama pull "$2"
fi

# 5. Install Cloudflare tunnel (cloudflared)
echo "==> [5/5] Installing Cloudflare tunnel (cloudflared)..."
if ! command -v cloudflared &>/dev/null; then
    $SUDO curl -fsSL -o /usr/local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
    $SUDO chmod +x /usr/local/bin/cloudflared
fi
echo "cloudflared is ready: $(cloudflared --version 2>/dev/null || echo 'ready')"

# Expose Ollama port via Cloudflare Quick Tunnel
echo "==> Creating Cloudflare tunnel for port ${OLLAMA_PORT}..."
pkill -f "cloudflared tunnel" || true
nohup cloudflared tunnel --url "http://localhost:${OLLAMA_PORT}" > "$CLOUDFLARE_LOG" 2>&1 &
TUNNEL_PID=$!

echo -n "Waiting for public Cloudflare Tunnel URL"
TUNNEL_URL=""
for i in {1..30}; do
    TUNNEL_URL=$(grep -o -m1 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' "$CLOUDFLARE_LOG" || true)
    if [ -n "$TUNNEL_URL" ]; then
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

if [ -z "$TUNNEL_URL" ]; then
    echo "Warning: Could not automatically find trycloudflare.com URL in log."
    echo "Check log output manually:"
    cat "$CLOUDFLARE_LOG"
else
    echo "================================================================="
    echo " SUCCESS! Ollama is now exposed to the internet via Cloudflare:"
    echo ""
    echo " Public URL     : $TUNNEL_URL"
    echo " OpenAI Base URL: $TUNNEL_URL/v1"
    echo " Pulled Model   : $MODEL_NAME"
    echo "================================================================="
    echo " To use in config.py, set:"
    echo " export MODEL_BASE_URL=\"$TUNNEL_URL/v1\""
    echo "================================================================="
fi

# Keep script running to maintain the background processes
echo "Tunnel is running (PID: $TUNNEL_PID). Press Ctrl+C to stop."
wait $TUNNEL_PID
