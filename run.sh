#!/usr/bin/env bash
set -e

# ==============================================================================
# AI UI STUDIO - Unified Deployment & Cloudflare Runner
# Serves both Frontend & Backend on Port 5000 and tunnels via Cloudflare
# ==============================================================================

MODEL_NAME="${1:-qwen3.8:27b}"
PORT=5000

echo -e "\n=================================================="
echo -e "🚀 Launching AI UI STUDIO"
echo -e "Target Model: ${MODEL_NAME}"
echo -e "==================================================\n"

# -------------------------------------------------------------
# 1. Ensure Repository is Cloned & Up to Date
# -------------------------------------------------------------
echo "--- [1/7] Setting up AI-UI-STUDIO Repository ---"
if [ ! -f "src/server.js" ]; then
  if [ -d "AI-UI-STUDIO" ]; then
    echo "Entering AI-UI-STUDIO directory..."
    cd AI-UI-STUDIO
  else
    echo "Cloning repository from GitHub..."
    git clone https://github.com/shah-ashish/AI-UI-STUDIO.git
    cd AI-UI-STUDIO
  fi
fi

if [ -d ".git" ]; then
  echo "Pulling latest repository updates..."
  git pull origin main || echo "⚠️ Git pull skipped, using local copy."
fi

# -------------------------------------------------------------
# 2. Install System Dependencies & Puppeteer Libraries (Linux)
# -------------------------------------------------------------
echo "--- [2/7] Installing System Utilities & Chromium Dependencies ---"
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq zstd curl python3 git \
    ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 \
    libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 \
    libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
    libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
    libxss1 libxtst6 lsb-release xdg-utils > /dev/null 2>&1 || true
fi

# -------------------------------------------------------------
# 3. Install & Start Ollama
# -------------------------------------------------------------
echo "--- [3/7] Setting up Ollama Server ---"
if ! command -v ollama >/dev/null 2>&1; then
  echo "Downloading Ollama Linux binary..."
  curl -L https://ollama.com/download/ollama-linux-amd64.tar.zst | sudo tar --zstd -x -C /usr/local
fi

pkill -f "ollama serve" || true
sleep 1

export OLLAMA_ORIGINS="*"
export OLLAMA_HOST="0.0.0.0"

ollama serve > /dev/null 2>&1 &
sleep 3
ollama --version

# -------------------------------------------------------------
# 4. Pull Target Model with Progress Bar
# -------------------------------------------------------------
echo "--- [4/7] Pulling Model: ${MODEL_NAME} ---"
python3 -u -c "
import urllib.request, json, sys

model = sys.argv[1]
req = urllib.request.Request(
    'http://localhost:11434/api/pull',
    data=json.dumps({'name': model}).encode(),
    headers={'Content-Type': 'application/json'}
)

last_pct = -1
last_status = ''
try:
    with urllib.request.urlopen(req) as resp:
        for line in resp:
            if not line.strip():
                continue
            d = json.loads(line.decode())
            status = d.get('status', '')
            total = d.get('total', 0)
            completed = d.get('completed', 0)
            if total > 0:
                pct = int((completed / total) * 100)
                if pct != last_pct:
                    mb_done = completed // (1024 * 1024)
                    mb_tot = total // (1024 * 1024)
                    sys.stdout.write(f'\r\033[K[Ollama] {status} {pct}% ({mb_done}/{mb_tot} MB)')
                    sys.stdout.flush()
                    last_pct = pct
            else:
                if status != last_status:
                    sys.stdout.write(f'\r\033[K[Ollama] {status}\n')
                    sys.stdout.flush()
                    last_status = status
    print(f'\r\033[K[Ollama] Model {model} downloaded successfully!\n')
except Exception as e:
    sys.exit(1)
" "${MODEL_NAME}" || ollama pull "${MODEL_NAME}"

# -------------------------------------------------------------
# 5. Node.js & Project Setup (Backend + Frontend Build)
# -------------------------------------------------------------
echo "--- [5/7] Preparing Backend & Frontend Application ---"

# Ensure Node.js v22+ is installed (required by better-sqlite3 v13 and Puppeteer v25)
NODE_MAJOR=0
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR=$(node -v | sed 's/v//' | cut -d'.' -f1)
fi

if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "Node.js v${NODE_MAJOR} detected. Upgrading to Node.js v22 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "Node.js runtime: $(node -v) (npm $(npm -v))"

echo "Installing root backend dependencies (Express, Puppeteer, SQLite)..."
npm install --no-audit --no-fund

echo "Building frontend static assets (React + Vite)..."
if [ -d "frontend" ]; then
  cd frontend
  npm install --no-audit --no-fund
  npm run build
  cd ..
fi

# Configure .env with default Ollama port on localhost
echo "Configuring .env file..."
cat <<EOF > .env
PORT=${PORT}
BASE_URL=http://localhost:11434
MODEL_NAME=${MODEL_NAME}
TIMEOUT=1200
EOF

# -------------------------------------------------------------
# 6. Start Unified Server (Serves Frontend + Backend API on :5000)
# -------------------------------------------------------------
echo "--- [6/7] Starting Backend Server on port ${PORT} ---"
pkill -f "node src/server.js" || true
sleep 1

node src/server.js > server.log 2>&1 &
sleep 3

# Verify server is responding
if curl -s "http://localhost:${PORT}/api/health" > /dev/null; then
  echo "✓ AI UI STUDIO server running successfully on http://localhost:${PORT}"
else
  echo "⚠️ Warning: Server health check failed. Output from server.log:"
  cat server.log || true
fi

# -------------------------------------------------------------
# 7. Expose Port 5000 Online via Pinggy (No API Key Required)
# -------------------------------------------------------------
echo "--- [7/7] Starting Pinggy Tunnel for AI UI STUDIO ---"

pkill -f "ssh.*a.pinggy.io" || true
pkill -f "cloudflared tunnel" || true
pkill -f "localtunnel" || true
sleep 1

# Start Cloudflare Tunnel as a silent backup link if available
if command -v cloudflared >/dev/null 2>&1; then
  cloudflared tunnel --url "http://localhost:${PORT}" > cloudflared.log 2>&1 &
  sleep 3
  CF_URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' cloudflared.log 2>/dev/null | head -n1 || true)
  if [ -n "$CF_URL" ]; then
    echo -e "\n=================================================="
    echo -e "👉 Cloudflare Backup URL:"
    echo -e "   $CF_URL"
    echo -e "==================================================\n"
  fi
fi

echo -e "\n=================================================="
echo -e "🎉 Connecting to Pinggy Tunnel (Port ${PORT})..."
echo -e "Direct HTTPS access with zero password prompt!"
echo -e "==================================================\n"

# Run Pinggy with 10s keepalive in a self-healing loop
while true; do
  ssh -o StrictHostKeyChecking=no \
      -o ServerAliveInterval=10 \
      -o ServerAliveCountMax=60 \
      -o ExitOnForwardFailure=yes \
      -p 443 -R0:localhost:${PORT} a.pinggy.io
  echo "⚠️ Pinggy connection closed. Reconnecting in 3 seconds..."
  sleep 3
done
