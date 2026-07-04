import { ReportStore } from "../models/Report.js";
import { scrapeWebsite, scrapePricingPage } from "./scraper.js";
import {
  researchCompany,
  discoverCompetitors,
  extractCompetitorIntel,
  generateSwot,
  generateInsights,
} from "./analysis.js";

export const STAGES = [
  { key: "research", label: "Company research" },
  { key: "discovery", label: "Competitor discovery" },
  { key: "collection", label: "Website data collection" },
  { key: "extraction", label: "Feature & pricing extraction" },
  { key: "swot", label: "SWOT analysis" },
  { key: "insights", label: "Market gaps & recommendations" },
];

export function freshStages() {
  return STAGES.map((s) => ({ ...s, status: "pending", detail: "" }));
}

async function setStage(reportId, stages, key, status, detail = "") {
  const stage = stages.find((s) => s.key === key);
  if (stage) {
    stage.status = status;
    stage.detail = detail;
    if (status === "running") stage.startedAt = new Date();
    if (status === "done" || status === "error") stage.finishedAt = new Date();
  }
  await ReportStore.update(reportId, { stages });
}

/**
 * Run the full research pipeline. Fire-and-forget from the route; the client
 * polls the report document for stage progress.
 */
export async function runPipeline(reportId, input) {
  const stages = freshStages();
  await ReportStore.update(reportId, { status: "running", stages });
  const data = {};

  try {
    // 1. Company research ---------------------------------------------------
    await setStage(reportId, stages, "research", "running", "Scraping company website");
    let targetSite = null;
    if (input.website) {
      targetSite = await scrapeWebsite(input.website);
    }
    await setStage(reportId, stages, "research", "running", "Profiling company with AI");
    data.profile = await researchCompany(input, targetSite);
    data.targetSite = targetSite ? { url: targetSite.url, ok: targetSite.ok, title: targetSite.title } : null;
    await ReportStore.update(reportId, { data });
    await setStage(reportId, stages, "research", "done", data.profile.name);

    // 2. Competitor discovery ----------------------------------------------
    await setStage(reportId, stages, "discovery", "running", "Identifying direct & indirect competitors");
    const discovered = await discoverCompetitors(data.profile, input);
    data.competitors = [
      ...(discovered.direct || []).map((c) => ({ ...c, type: "direct" })),
      ...(discovered.indirect || []).map((c) => ({ ...c, type: "indirect" })),
    ];
    await ReportStore.update(reportId, { data });
    await setStage(reportId, stages, "discovery", "done", `${data.competitors.length} competitors found`);

    // 3. Website data collection --------------------------------------------
    await setStage(reportId, stages, "collection", "running", "Visiting competitor websites");
    const scrapeTargets = data.competitors.filter((c) => c.website);
    let scraped = 0;
    // Limit concurrency to 3 to stay polite and stable
    for (let i = 0; i < scrapeTargets.length; i += 3) {
      const batch = scrapeTargets.slice(i, i + 3);
      await Promise.all(
        batch.map(async (competitor) => {
          competitor.site = await scrapeWebsite(competitor.website);
          if (competitor.site?.ok) {
            competitor.pricingPage = await scrapePricingPage(competitor.website);
          }
          scraped++;
          await setStage(reportId, stages, "collection", "running", `Scraped ${scraped}/${scrapeTargets.length} sites`);
        })
      );
      await ReportStore.update(reportId, { data });
    }
    await setStage(reportId, stages, "collection", "done", `${scraped} sites collected`);

    // 4. Feature & pricing extraction ---------------------------------------
    await setStage(reportId, stages, "extraction", "running", "Extracting services & pricing with AI");
    for (const [index, competitor] of data.competitors.entries()) {
      try {
        competitor.intel = await extractCompetitorIntel(competitor, competitor.site, competitor.pricingPage);
      } catch (err) {
        competitor.intel = { services: [], pricing: { model: "unknown", plans: [] }, confidence: "low", error: err.message };
      }
      // Trim heavy scraped payloads once analyzed — keep the doc lean
      if (competitor.site) competitor.site = { url: competitor.site.url, ok: competitor.site.ok };
      delete competitor.pricingPage;
      await setStage(reportId, stages, "extraction", "running", `Analyzed ${index + 1}/${data.competitors.length}: ${competitor.name}`);
      await ReportStore.update(reportId, { data });
    }
    await setStage(reportId, stages, "extraction", "done", "Competitor intelligence complete");

    // 5. SWOT ----------------------------------------------------------------
    await setStage(reportId, stages, "swot", "running", "Generating SWOT analysis");
    data.swot = await generateSwot(data.profile, data.competitors);
    await ReportStore.update(reportId, { data });
    await setStage(reportId, stages, "swot", "done");

    // 6. Market gaps, recommendations, executive summary ---------------------
    await setStage(reportId, stages, "insights", "running", "Identifying market gaps & writing summary");
    const insights = await generateInsights(data.profile, data.competitors, data.swot);
    data.marketGaps = insights.marketGaps || [];
    data.recommendations = insights.recommendations || [];
    data.executiveSummary = insights.executiveSummary || "";
    await ReportStore.update(reportId, { data, status: "completed" });
    await setStage(reportId, stages, "insights", "done");
  } catch (err) {
    console.error(`Pipeline failed [report=${reportId}]:`, err);
    const running = stages.find((s) => s.status === "running");
    // Show specific message in dev; generic in production to avoid leaking internals
    const clientMsg =
      process.env.NODE_ENV === "production" ? "Analysis failed. Please try again." : err.message;
    if (running) await setStage(reportId, stages, running.key, "error", clientMsg);
    await ReportStore.update(reportId, { status: "failed", error: clientMsg, data });
  }
}
