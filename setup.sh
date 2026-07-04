#!/usr/bin/env bash
# ============================================================================
# AI Business Intelligence Agent — one-command setup
# Usage:  bash setup.sh          (install + configure)
#         bash setup.sh --start  (install + configure + start dev servers)
# ============================================================================
set -e

BOLD="\033[1m"; GREEN="\033[32m"; YELLOW="\033[33m"; RESET="\033[0m"
say()  { echo -e "${BOLD}${GREEN}▸${RESET} $1"; }
warn() { echo -e "${BOLD}${YELLOW}⚠${RESET} $1"; }

echo -e "${BOLD}"
echo "  ┌─────────────────────────────────────────────┐"
echo "  │   AI Business Intelligence Agent — Setup    │"
echo "  └─────────────────────────────────────────────┘"
echo -e "${RESET}"

# 1. Check Node.js ------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install Node 18+ from https://nodejs.org and re-run."
  exit 1
fi
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Node 18+ required (found $(node -v)). Please upgrade."
  exit 1
fi
say "Node $(node -v) detected"

# 2. Install dependencies -----------------------------------------------------
say "Installing root tools (concurrently)…"
npm install --no-audit --no-fund

say "Installing server dependencies…"
(cd server && PUPPETEER_SKIP_DOWNLOAD=true npm install --no-audit --no-fund --omit=optional)

say "Installing client dependencies…"
(cd client && npm install --no-audit --no-fund)

# 3. Configure environment ----------------------------------------------------
if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  say "Created server/.env from template"
else
  say "server/.env already exists — leaving it untouched"
fi

if ! grep -q "^GROQ_API_KEY=.\+" server/.env; then
  echo ""
  warn "GROQ_API_KEY is empty."
  read -r -p "  Paste your Groq API key now (or press Enter to add it later): " KEY
  if [ -n "$KEY" ]; then
    tmp=$(mktemp)
    sed "s|^GROQ_API_KEY=.*|GROQ_API_KEY=${KEY}|" server/.env > "$tmp" && mv "$tmp" server/.env
    say "API key saved to server/.env"
  else
    warn "Remember to set GROQ_API_KEY in server/.env before running research."
    warn "Get a free key: https://console.groq.com/keys"
  fi
fi

if ! grep -q "^MONGODB_URI=.\+" server/.env; then
  warn "MONGODB_URI is empty — the app will use an in-memory store (fine for demos)."
fi

# 4. Done — local dev ---------------------------------------------------------
echo ""
say "Setup complete!"
echo ""
echo "  ── LOCAL DEVELOPMENT ──────────────────────────────────────────────────"
echo "  Start dev servers:          npm run dev"
echo "     → client   http://localhost:5173"
echo "     → server   http://localhost:5000"
echo ""
echo "  Production build + serve:   npm run build && npm start"
echo ""
echo "  Optional (JS-heavy sites):  cd server && npm install puppeteer"
echo ""
echo "  ── DEPLOY TO VERCEL (frontend) + RAILWAY (backend) ────────────────────"
echo ""
echo "  BACKEND — Railway / Render / Fly.io:"
echo "    1. Create a new project and connect this repo."
echo "    2. Set root directory to: server/"
echo "    3. Set start command to:  node src/index.js"
echo "    4. Add environment variables from server/.env:"
echo "         GROQ_API_KEY, MONGODB_URI, GROQ_MODEL, NODE_ENV=production"
echo "         ALLOWED_ORIGINS=https://<your-vercel-app>.vercel.app"
echo "    5. Deploy and copy the public URL (e.g. https://bi-agent-api.railway.app)"
echo ""
echo "  FRONTEND — Vercel:"
echo "    1. Install Vercel CLI:     npm i -g vercel"
echo "    2. From the project root:  vercel"
echo "    3. When prompted:"
echo "         Framework preset: Vite"
echo "         Root directory:   . (project root — vercel.json handles the build)"
echo "    4. In the Vercel dashboard → Settings → Environment Variables, add:"
echo "         VITE_API_URL = https://<your-railway-backend-url>"
echo "    5. Redeploy for the env var to take effect: vercel --prod"
echo ""
echo "  FULL-STACK ON VERCEL (Pro plan only — pipelines need ~5 min timeout):"
echo "    Vercel Hobby plan has a 10s function timeout — too short for this app."
echo "    On Vercel Pro you can set maxDuration: 300 in vercel.json."
echo "    Recommended: keep frontend on Vercel, backend on Railway (free tier)."
echo ""

if [ "$1" = "--start" ]; then
  say "Starting dev servers…"
  npm run dev
fi
