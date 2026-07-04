const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Call Gemini and return raw text.
 */
export async function askGemini(prompt, { temperature = 0.4, maxOutputTokens = 4096 } = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured. Add it to server/.env");

  const url = `${BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens },
  };

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        // Retry on rate limit / transient errors
        if ([429, 500, 503].includes(res.status) && attempt < 3) {
          await sleep(attempt * 1500);
          continue;
        }
        throw new Error(`Gemini API error ${res.status}: ${text.slice(0, 300)}`);
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
      if (!text) throw new Error("Gemini returned an empty response");
      return text;
    } catch (err) {
      lastError = err;
      if (attempt < 3) await sleep(attempt * 1500);
    }
  }
  throw lastError;
}

/**
 * Call Gemini expecting a JSON object/array back. Strips code fences and
 * recovers from minor formatting noise.
 */
export async function askGeminiJSON(prompt, options = {}) {
  const wrapped = `${prompt}\n\nRespond ONLY with valid JSON. No markdown fences, no commentary.`;
  const text = await askGemini(wrapped, options);
  return parseLooseJSON(text);
}

export function parseLooseJSON(text) {
  let cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt to extract the first JSON object or array in the text
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
