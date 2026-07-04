import mongoose from "mongoose";
import crypto from "node:crypto";
import { isMongoConnected } from "../config/db.js";

const StageSchema = new mongoose.Schema(
  {
    key: String,
    label: String,
    status: { type: String, enum: ["pending", "running", "done", "error"], default: "pending" },
    detail: String,
    startedAt: Date,
    finishedAt: Date,
  },
  { _id: false }
);

const ReportSchema = new mongoose.Schema(
  {
    input: {
      company: String,
      website: String,
      industry: String,
      region: String,
    },
    status: { type: String, enum: ["queued", "running", "completed", "failed"], default: "queued" },
    error: String,
    stages: [StageSchema],
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false }
);

const ReportModel = mongoose.models.Report || mongoose.model("Report", ReportSchema);

// ---------------------------------------------------------------------------
// Store abstraction: MongoDB when connected, otherwise an in-memory Map.
// ---------------------------------------------------------------------------
const memory = new Map();

function now() {
  return new Date();
}

export const ReportStore = {
  async create(doc) {
    if (isMongoConnected()) {
      const created = await ReportModel.create(doc);
      return created.toObject();
    }
    const id = crypto.randomUUID();
    const record = { _id: id, ...doc, createdAt: now(), updatedAt: now() };
    memory.set(id, record);
    return structuredClone(record);
  },

  async get(id) {
    if (isMongoConnected()) {
      const found = await ReportModel.findById(id).lean();
      return found || null;
    }
    const record = memory.get(id);
    return record ? structuredClone(record) : null;
  },

  async list(limit = 20) {
    if (isMongoConnected()) {
      return ReportModel.find({}, { data: 0 }).sort({ createdAt: -1 }).limit(limit).lean();
    }
    return [...memory.values()]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map(({ data, ...rest }) => structuredClone(rest));
  },

  async update(id, patch) {
    if (isMongoConnected()) {
      const updated = await ReportModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
      return updated;
    }
    const record = memory.get(id);
    if (!record) return null;
    Object.assign(record, patch, { updatedAt: now() });
    return structuredClone(record);
  },
};
