import mongoose from "mongoose";

let usingMongo = false;

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("⚠ MONGODB_URI not set — using in-memory store (reports are lost on restart).");
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    usingMongo = true;
    console.log("✔ Connected to MongoDB");
  } catch (err) {
    console.warn(`⚠ MongoDB connection failed (${err.message}) — falling back to in-memory store.`);
  }
}

export function isMongoConnected() {
  return usingMongo && mongoose.connection.readyState === 1;
}
