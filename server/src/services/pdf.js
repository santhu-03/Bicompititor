import PDFDocument from "pdfkit";

const INK = "#1B2432";
const MUTED = "#5A6675";
const ACCENT = "#0E7C66";
const LINE = "#D8DEE6";
const AMBER = "#B87A00";

/**
 * Stream a professional BI report PDF into `res`.
 */
export function streamReportPdf(report, res) {
  const doc = new PDFDocument({ size: "A4", margins: { top: 64, bottom: 64, left: 56, right: 56 } });
  const { profile = {}, competitors = [], swot = {}, marketGaps = [], recommendations = [], executiveSummary = "" } = report.data || {};

  const filename = `${(profile.name || "report").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-business-intelligence.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  doc.pipe(res);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  const ensureSpace = (needed = 120) => {
    if (doc.y > doc.page.height - doc.page.margins.bottom - needed) doc.addPage();
  };

  const sectionTitle = (text) => {
    ensureSpace(140);
    doc.moveDown(1.2);
    doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(9).text(text.toUpperCase(), { characterSpacing: 1.5 });
    doc.moveTo(doc.page.margins.left, doc.y + 4).lineTo(doc.page.margins.left + pageWidth, doc.y + 4).strokeColor(LINE).lineWidth(0.7).stroke();
    doc.moveDown(0.8);
    doc.fillColor(INK);
  };

  const bullets = (items, { color = INK } = {}) => {
    doc.font("Helvetica").fontSize(10).fillColor(color);
    for (const item of items || []) {
      ensureSpace(60);
      doc.text(`•  ${item}`, { indent: 4, lineGap: 3, paragraphGap: 3 });
    }
    doc.fillColor(INK);
  };

  // --- Cover ----------------------------------------------------------------
  doc.rect(0, 0, doc.page.width, 6).fill(ACCENT);
  doc.moveDown(4);
  doc.fillColor(MUTED).font("Helvetica").fontSize(10).text("BUSINESS INTELLIGENCE REPORT", { characterSpacing: 2 });
  doc.moveDown(0.6);
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(30).text(profile.name || report.input?.company || "Company Report");
  if (profile.tagline) {
    doc.moveDown(0.3);
    doc.fillColor(MUTED).font("Helvetica").fontSize(12).text(profile.tagline);
  }
  doc.moveDown(1);
  doc.fillColor(MUTED).fontSize(9).text(
    [
      profile.industry ? `Industry: ${profile.industry}` : null,
      profile.businessModel ? `Model: ${profile.businessModel}` : null,
      profile.headquarters ? `HQ: ${profile.headquarters}` : null,
      profile.companySize ? `Size: ${profile.companySize}` : null,
      profile.fundingStage ? `Funding: ${profile.fundingStage}` : null,
      `Generated: ${new Date(report.createdAt || Date.now()).toDateString()}`,
    ]
      .filter(Boolean)
      .join("     ")
  );

  // --- Executive summary ------------------------------------------------------
  if (executiveSummary) {
    sectionTitle("Executive Summary");
    doc.font("Helvetica").fontSize(10.5).fillColor(INK).text(executiveSummary, { lineGap: 4, align: "justify" });
  }

  // --- Company overview ---------------------------------------------------------
  sectionTitle("Company Overview");
  if (profile.overview) doc.font("Helvetica").fontSize(10.5).text(profile.overview, { lineGap: 4, align: "justify" });
  if (profile.coreServices?.length) {
    doc.moveDown(0.6);
    doc.font("Helvetica-Bold").fontSize(10).text("Core services");
    doc.moveDown(0.2);
    bullets(profile.coreServices);
  }
  if (profile.uniqueSellingPoints?.length) {
    doc.moveDown(0.4);
    doc.font("Helvetica-Bold").fontSize(10).text("Unique selling points");
    doc.moveDown(0.2);
    bullets(profile.uniqueSellingPoints);
  }
  if (profile.recentDevelopments?.length) {
    doc.moveDown(0.4);
    doc.font("Helvetica-Bold").fontSize(10).text("Recent developments");
    doc.moveDown(0.2);
    bullets(profile.recentDevelopments);
  }

  // --- Competitor landscape ----------------------------------------------------
  sectionTitle("Competitor Landscape");
  for (const competitor of competitors) {
    ensureSpace(120);
    doc.font("Helvetica-Bold").fontSize(11.5).fillColor(INK).text(competitor.name, { continued: true });
    const typeLabel = `${competitor.type?.toUpperCase() || ""}${competitor.intel?.marketPosition && competitor.intel.marketPosition !== "unknown" ? ` · ${competitor.intel.marketPosition.toUpperCase()}` : ""}`;
    doc.font("Helvetica").fontSize(8.5).fillColor(competitor.type === "direct" ? ACCENT : AMBER).text(`   ${typeLabel}`);
    if (competitor.website) doc.fillColor(MUTED).fontSize(8.5).text(competitor.website);
    doc.moveDown(0.2);
    doc.fillColor(INK).font("Helvetica").fontSize(10).text(competitor.summary || "", { lineGap: 3 });
    if (competitor.intel?.services?.length) {
      doc.moveDown(0.2);
      doc.fillColor(MUTED).fontSize(9).text(`Services: ${competitor.intel.services.join(" · ")}`, { lineGap: 3 });
    }
    if (competitor.intel?.differentiators?.length) {
      doc.moveDown(0.2);
      doc.fillColor(MUTED).fontSize(9).text(`Differentiators: ${competitor.intel.differentiators.join(" · ")}`, { lineGap: 3 });
    }
    doc.moveDown(0.7);
  }

  // --- Pricing comparison ---------------------------------------------------------
  sectionTitle("Pricing Comparison");
  const priced = competitors.filter((c) => c.intel?.pricing?.plans?.length);
  if (!priced.length) {
    doc.font("Helvetica").fontSize(10).fillColor(MUTED).text("No public pricing information could be confirmed for the analyzed competitors.");
  }
  for (const competitor of priced) {
    ensureSpace(100);
    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(INK).text(`${competitor.name}  `, { continued: true });
    doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(`(${competitor.intel.pricing.model || "unknown"})`);
    doc.moveDown(0.2);
    for (const plan of competitor.intel.pricing.plans.slice(0, 5)) {
      ensureSpace(50);
      doc.font("Helvetica").fontSize(9.5).fillColor(INK)
        .text(`•  ${plan.name} — ${plan.price}${plan.highlights?.length ? `  (${plan.highlights.join(", ")})` : ""}`, { indent: 4, lineGap: 3 });
    }
    if (competitor.intel.pricing.notes) {
      doc.fontSize(8.5).fillColor(MUTED).text(competitor.intel.pricing.notes, { indent: 8 });
    }
    doc.moveDown(0.6);
  }

  // --- SWOT ---------------------------------------------------------------------
  sectionTitle("SWOT Analysis");
  const swotBlocks = [
    ["Strengths", swot.strengths, ACCENT],
    ["Weaknesses", swot.weaknesses, AMBER],
    ["Opportunities", swot.opportunities, ACCENT],
    ["Threats", swot.threats, AMBER],
  ];
  for (const [label, items, color] of swotBlocks) {
    if (!items?.length) continue;
    ensureSpace(110);
    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(color).text(label);
    doc.moveDown(0.2);
    bullets(items);
    doc.moveDown(0.5);
  }

  // --- Market gaps ----------------------------------------------------------------
  sectionTitle("Market Gaps & Opportunities");
  for (const gap of marketGaps) {
    ensureSpace(90);
    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(INK).text(gap.gap, { continued: true });
    doc.font("Helvetica").fontSize(8.5).fillColor(gap.opportunitySize === "high" ? ACCENT : MUTED).text(`   ${(gap.opportunitySize || "").toUpperCase()} OPPORTUNITY`);
    doc.moveDown(0.15);
    doc.font("Helvetica").fontSize(10).fillColor(INK).text(gap.evidence || "", { lineGap: 3 });
    doc.moveDown(0.6);
  }

  // --- Recommendations --------------------------------------------------------------
  sectionTitle("Business Recommendations");
  recommendations.forEach((rec, i) => {
    ensureSpace(90);
    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(INK).text(`${i + 1}. ${rec.action}`, { continued: true });
    doc.font("Helvetica").fontSize(8.5).fillColor(MUTED).text(`   ${rec.timeframe || ""}`);
    doc.moveDown(0.15);
    doc.font("Helvetica").fontSize(10).fillColor(INK).text(rec.rationale || "", { lineGap: 3 });
    doc.moveDown(0.6);
  });

  // --- Footer note --------------------------------------------------------------------
  doc.moveDown(1.5);
  doc.fontSize(8).fillColor(MUTED).text(
    "Generated automatically by AI Business Intelligence Agent. AI-extracted competitor data (especially pricing) should be verified before making financial decisions.",
    { lineGap: 2 }
  );

  doc.end();
}
