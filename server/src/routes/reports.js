import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { ReportStore } from "../models/Report.js";
import { runPipeline, freshStages } from "../services/pipeline.js";
import { streamReportPdf } from "../services/pdf.js";

const router = Router();

// Strict limiter for expensive AI operations — 10 research runs per IP per hour
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Report creation limit reached. Each IP can start 10 research runs per hour." },
});

// Input schema — enforce types and max lengths before touching any service
const reportInputSchema = z.object({
  company: z.string().max(200).default(""),
  website: z.string().max(500).default(""),
  industry: z.string().max(100).default(""),
  region: z.string().max(100).default(""),
});

// Accept MongoDB ObjectId (24 hex) or UUID (in-memory store)
const ID_RE = /^[0-9a-f]{24}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateId(req, res, next) {
  if (!ID_RE.test(req.params.id)) {
    return res.status(400).json({ error: "Invalid report ID" });
  }
  next();
}

/** POST /api/reports — start a new research run */
router.post("/", createLimiter, async (req, res) => {
  let parsed;
  try {
    parsed = reportInputSchema.parse(req.body || {});
  } catch {
    return res.status(400).json({ error: "Invalid input" });
  }

  const { company, website, industry, region } = parsed;
  if (!company.trim() && !website.trim()) {
    return res.status(400).json({ error: "Provide a company name or a website URL." });
  }

  const report = await ReportStore.create({
    input: { company: company.trim(), website: website.trim(), industry: industry.trim(), region: region.trim() },
    status: "queued",
    stages: freshStages(),
    data: {},
  });

  // Fire-and-forget — client polls for progress
  runPipeline(report._id.toString(), report.input);

  res.status(202).json({ id: report._id, status: report.status });
});

/** GET /api/reports — recent runs (without heavy data payload) */
router.get("/", async (_req, res) => {
  res.json(await ReportStore.list(20));
});

/** GET /api/reports/:id — full report including stage progress */
router.get("/:id", validateId, async (req, res) => {
  const report = await ReportStore.get(req.params.id);
  if (!report) return res.status(404).json({ error: "Report not found" });
  res.json(report);
});

/** GET /api/reports/:id/pdf — download the PDF */
router.get("/:id/pdf", validateId, async (req, res) => {
  const report = await ReportStore.get(req.params.id);
  if (!report) return res.status(404).json({ error: "Report not found" });
  if (report.status !== "completed") {
    return res.status(409).json({ error: "Report is not completed yet" });
  }
  try {
    streamReportPdf(report, res);
  } catch (err) {
    console.error("PDF generation failed:", err);
    if (!res.headersSent) res.status(500).json({ error: "PDF generation failed" });
  }
});

export default router;
