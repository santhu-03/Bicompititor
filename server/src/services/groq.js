import Groq from "groq-sdk";

// Allowlist prevents arbitrary/expensive models from being injected via env
const ALLOWED_MODELS = new Set([
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "llama3-8b-8192",
  "llama3-70b-8192",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
]);

const requestedModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_MODEL = ALLOWED_MODELS.has(requestedModel) ? requestedModel : "llama-3.3-70b-versatile";

if (process.env.GROQ_MODEL && !ALLOWED_MODELS.has(process.env.GROQ_MODEL)) {
  console.warn(`⚠ GROQ_MODEL "${process.env.GROQ_MODEL}" is not in the allowlist — falling back to llama-3.3-70b-versatile`);
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Call Groq and return raw text.
 */
export async function askGroq(prompt, { temperature = 0.4, maxTokens = 1024 } = {}) {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured. Add it to server/.env");

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Groq request: ${GROQ_MODEL} (attempt ${attempt})`);
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: GROQ_MODEL,
        temperature,
        max_tokens: maxTokens,
      });
      const text = completion.choices[0]?.message?.content ?? "";
      if (!text) throw new Error("Groq returned an empty response");
      console.log("Groq response received");
      return text;
    } catch (err) {
      lastError = err;
      if ((err.status === 429 || err.status >= 500) && attempt < 3) {
        await sleep(attempt * 1500);
        continue;
      }
      if (attempt < 3) await sleep(attempt * 1500);
    }
  }
  throw lastError;
}

/**
 * Call Groq expecting a JSON object/array back.
 * Uses json_object response_format to guarantee valid JSON output.
 */
export async function askGroqJSON(prompt, { temperature = 0.4, maxTokens = 1024 } = {}) {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured. Add it to server/.env");

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Groq request: ${GROQ_MODEL} (attempt ${attempt}, JSON mode)`);
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: GROQ_MODEL,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      });
      const text = completion.choices[0]?.message?.content ?? "";
      if (!text) throw new Error("Groq returned an empty response");
      console.log("Groq response received");
      return JSON.parse(text);
    } catch (err) {
      lastError = err;
      if ((err.status === 429 || err.status >= 500) && attempt < 3) {
        await sleep(attempt * 1500);
        continue;
      }
      if (attempt < 3) await sleep(attempt * 1500);
    }
  }
  throw lastError;
}

export function parseLooseJSON(text) {
  let cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("Could not parse JSON from AI response");
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
