@echo off
REM ============================================================
REM  AI Business Intelligence Agent - Windows setup
REM  Usage: setup.bat
REM ============================================================
echo.
echo  ============================================
echo    AI Business Intelligence Agent - Setup
echo  ============================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo Node.js is not installed. Install Node 18+ from https://nodejs.org and re-run.
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo  Node %%v detected

echo.
echo  Installing root tools...
call npm install --no-audit --no-fund

echo  Installing server dependencies...
cd server
set PUPPETEER_SKIP_DOWNLOAD=true
call npm install --no-audit --no-fund --omit=optional
cd ..

echo  Installing client dependencies...
cd client
call npm install --no-audit --no-fund
cd ..

if not exist server\.env (
  copy server\.env.example server\.env >nul
  echo  Created server\.env from template
)

echo.
echo  Setup complete!
echo.
echo  ── LOCAL DEVELOPMENT ──────────────────────────────────────────────
echo  1. Open server\.env and set GROQ_API_KEY
echo     (free key: https://console.groq.com/keys)
echo  2. Optionally set MONGODB_URI (Atlas) - otherwise in-memory store is used
echo  3. Start dev servers:   npm run dev
echo       client  http://localhost:5173
echo       server  http://localhost:5000
echo.
echo  ── DEPLOY TO VERCEL (frontend) + RAILWAY (backend) ────────────────
echo.
echo  BACKEND - Railway / Render / Fly.io:
echo    1. Create a new project and connect this repo
echo    2. Set root directory to: server/
echo    3. Set start command to:  node src/index.js
echo    4. Add environment variables from server\.env:
echo         GROQ_API_KEY, MONGODB_URI, GROQ_MODEL, NODE_ENV=production
echo         ALLOWED_ORIGINS=https://^<your-vercel-app^>.vercel.app
echo    5. Deploy and copy the public URL
echo.
echo  FRONTEND - Vercel:
echo    1. Install Vercel CLI:    npm i -g vercel
echo    2. From project root:     vercel
echo    3. Framework preset: Vite, Root directory: . (project root)
echo    4. In Vercel dashboard - Environment Variables, add:
echo         VITE_API_URL = https://^<your-railway-backend-url^>
echo    5. Redeploy:              vercel --prod
echo.
echo  NOTE: Vercel Hobby plan has a 10s function timeout - too short for this
echo  app's 2-4 min research pipeline. Use Railway for the backend (free tier).
echo.
echo  Optional for JS-heavy sites:  cd server ^&^& npm install puppeteer
echo.
pause
