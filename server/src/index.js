import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDatabase } from "./config/db.js";
import reportsRouter from "./routes/reports.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === "production";

// Trust reverse-proxy headers (Vercel, Railway, Render all set X-Forwarded-*)
app.set("trust proxy", 1);

// Security headers via Helmet
app.use(
  helmet({
    // Relax CSP in dev so Vite HMR works; enforce in prod
    contentSecurityPolicy: isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS — restrict origins in production
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:5000"];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin requests (no Origin header) and the allowlist
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("CORS: origin not allowed"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
    maxAge: 600,
  })
);

// Force HTTPS in production (proxy sets x-forwarded-proto)
if (isProd) {
  app.use((req, res, next) => {
    if (req.headers["x-forwarded-proto"] === "http") {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Keep body payload small — no large JSON dumps expected from the client
app.use(express.json({ limit: "50kb" }));

// Global rate limit — prevents DDoS on all API routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});
app.use("/api", globalLimiter);

// Basic request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path} ip=${req.ip}`);
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    database: process.env.MONGODB_URI ? "mongodb" : "in-memory",
  });
});

app.use("/api/reports", reportsRouter);

// Serve the built client in production
const clientDist = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get(/^\/(?!api).*/, (_req, res, next) => {
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next();
  });
});

// Generic error handler — never leak stack traces to clients
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

connectDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`✔ BI Agent server running at http://localhost:${PORT}`);
    if (!process.env.GEMINI_API_KEY) {
      console.warn("⚠ GEMINI_API_KEY not set — AI analysis will fail. Add it to server/.env");
    }
  });
});
