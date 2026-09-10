# ==============================================================================
# Stage 1: Build Frontend Assets (React + Vite + Tailwind CSS)
# ==============================================================================
FROM node:22-bookworm-slim AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund

COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Production Server Runner
# ==============================================================================
FROM node:22-bookworm-slim AS runner

WORKDIR /app

# Install system utilities and Chromium dependencies required for Puppeteer headless scraping
RUN apt-get update -qq && \
    apt-get install -y -qq --no-install-recommends \
    curl \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    xdg-utils && \
    rm -rf /var/lib/apt/lists/*

# Install backend dependencies
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Copy backend source code & skills
COPY src/ ./src/
COPY index.js ./

# Copy compiled frontend from builder
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create persistent storage directories
RUN mkdir -p /app/data /app/output

# Environment configuration
ENV NODE_ENV=production \
    PORT=5000 \
    BASE_URL=http://localhost:11434 \
    MODEL_NAME=qwen2.5-coder:14b \
    TIMEOUT=1200

EXPOSE 5000

# Docker healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]
