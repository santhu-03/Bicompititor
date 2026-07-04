import { askGroqJSON } from "./groq.js";

/**
 * Stage 1 — Company research: profile the target company from its name/site content.
 */
export async function researchCompany(input, siteData) {
  const prompt = `You are a business intelligence analyst. Profile this company.

Company name: ${input.company || "(infer from website)"}
Website: ${input.website || "unknown"}
Industry hint: ${input.industry || "unknown"}
Region focus: ${input.region || "global"}

Scraped website content (may be empty):
${siteData?.ok ? JSON.stringify({ title: siteData.title, description: siteData.description, headings: siteData.headings, text: siteData.bodyText.slice(0, 1500) }) : "No website data available — use your knowledge of the company."}

Return JSON:
{
  "name": "official company name",
  "tagline": "one-line positioning",
  "industry": "primary industry",
  "businessModel": "e.g. B2B SaaS, marketplace, agency",
  "targetCustomers": ["segment", ...],
  "coreServices": ["service/product", ...],
  "uniqueSellingPoints": ["USP", ...],
  "overview": "150-word neutral company overview"
}`;
  return askGroqJSON(prompt, { temperature: 0.3 });
}

/**
 * Stage 2 — Competitor discovery.
 */
export async function discoverCompetitors(profile, input) {
  const prompt = `You are a market research analyst. Identify competitors of this company.

Company profile: ${JSON.stringify(profile)}
Region focus: ${input.region || "global"}

Find 3 direct competitors (same offering, same customers) and 2 indirect competitors (alternative ways customers solve the same problem). Only include real companies you are confident exist. Website domains must be their real primary domains — if unsure of the domain, set it to null.

Return JSON:
{
  "direct": [{ "name": "", "website": "https://... or null", "summary": "one line on what they do", "whyCompetitor": "one line" }],
  "indirect": [{ "name": "", "website": "https://... or null", "summary": "", "whyCompetitor": "" }]
}`;
  return askGroqJSON(prompt, { temperature: 0.4 });
}

/**
 * Stage 4 — Feature & pricing extraction for one competitor from scraped data.
 */
export async function extractCompetitorIntel(competitor, siteData, pricingData) {
  const prompt = `You are extracting competitive intelligence for: ${competitor.name}

Known summary: ${competitor.summary}

Scraped homepage:
${siteData?.ok ? JSON.stringify({ title: siteData.title, description: siteData.description, headings: siteData.headings, nav: siteData.navLinks, pricingSignals: siteData.pricingSignals, text: siteData.bodyText.slice(0, 1200) }) : "Not available — rely on your knowledge, and mark confidence lower."}

Scraped pricing page:
${pricingData?.ok ? JSON.stringify({ headings: pricingData.headings, pricingSignals: pricingData.pricingSignals, text: pricingData.bodyText.slice(0, 1000) }) : "Not available."}

Return JSON:
{
  "services": ["key service/feature", ...] (max 8),
  "differentiators": ["what makes them stand out", ...] (max 4),
  "pricing": {
    "model": "subscription | usage-based | one-time | quote-based | freemium | unknown",
    "plans": [{ "name": "", "price": "e.g. $29/mo or Contact sales", "highlights": ["", ""] }],
    "notes": "one-line pricing observation"
  },
  "strengths": ["", ""],
  "weaknesses": ["", ""],
  "confidence": "high | medium | low"
}`;
  return askGroqJSON(prompt, { temperature: 0.3 });
}

/**
 * Stage 5 — SWOT for the target company in context of competitors.
 */
export async function generateSwot(profile, competitors) {
  const prompt = `Perform a SWOT analysis for ${profile.name} given this competitive landscape.

Company: ${JSON.stringify(profile)}
Competitor intelligence: ${JSON.stringify(competitors.map((c) => ({ name: c.name, services: c.intel?.services, strengths: c.intel?.strengths, weaknesses: c.intel?.weaknesses, pricing: c.intel?.pricing?.model })))}

Be specific and evidence-based — no generic filler like "strong brand". Each point must reference something concrete about this company or market.

Return JSON:
{
  "strengths": ["", "", "", ""],
  "weaknesses": ["", "", "", ""],
  "opportunities": ["", "", "", ""],
  "threats": ["", "", "", ""]
}`;
  return askGroqJSON(prompt, { temperature: 0.4 });
}

/**
 * Stage 6 — Market gaps, recommendations, executive summary.
 */
export async function generateInsights(profile, competitors, swot) {
  const prompt = `You are writing the final section of a business intelligence report on ${profile.name}.

Company: ${JSON.stringify(profile)}
Competitors: ${JSON.stringify(competitors.map((c) => ({ name: c.name, type: c.type, services: c.intel?.services, pricing: c.intel?.pricing })))}
SWOT: ${JSON.stringify(swot)}

Return JSON:
{
  "marketGaps": [
    { "gap": "untapped service, missing feature, or underserved segment", "evidence": "why this gap exists based on the competitor data", "opportunitySize": "high | medium | low" }
  ] (3-5 items),
  "recommendations": [
    { "action": "specific action the company should take", "rationale": "why", "timeframe": "0-3 months | 3-6 months | 6-12 months" }
  ] (4-6 items, ordered by priority),
  "executiveSummary": "200-word summary for management: market position, key competitive dynamics, the single biggest opportunity, and the single biggest risk. Plain prose, no bullets."
}`;
  return askGroqJSON(prompt, { temperature: 0.45 });
}
