import { pdfUrl } from "../lib/api.js";

function Section({ eyebrow, title, children }) {
  return (
    <section className="mt-14">
      <p className="font-mono text-[11px] tracking-[0.3em] text-teal">{eyebrow}</p>
      <h3 className="font-display font-bold text-2xl mt-1">{title}</h3>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Tag({ children, tone = "fog" }) {
  const tones = {
    fog: "border-edge text-fog",
    teal: "border-teal/50 text-teal",
    signal: "border-signal/50 text-signal",
    danger: "border-danger/50 text-danger",
  };
  return (
    <span className={`inline-block font-mono text-[10px] tracking-wider border rounded px-1.5 py-0.5 ${tones[tone]}`}>
      {children}
    </span>
  );
}

export default function ReportView({ report, onReset }) {
  const { profile = {}, competitors = [], swot = {}, marketGaps = [], recommendations = [], executiveSummary } = report.data || {};
  const priced = competitors.filter((c) => c.intel?.pricing?.plans?.length);

  return (
    <div className="pt-12">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-edge pb-8">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-signal">CASE FILE · COMPLETE</p>
          <h2 className="font-display font-bold text-4xl mt-2">{profile.name}</h2>
          {profile.tagline && <p className="text-fog mt-2">{profile.tagline}</p>}
          <div className="flex flex-wrap gap-2 mt-4">
            {profile.industry && <Tag>{profile.industry}</Tag>}
            {profile.businessModel && <Tag>{profile.businessModel}</Tag>}
            {profile.companySize && <Tag>{profile.companySize} employees</Tag>}
            {profile.headquarters && <Tag>{profile.headquarters}</Tag>}
            {profile.fundingStage && <Tag>{profile.fundingStage}</Tag>}
            {profile.foundedYear && <Tag>est. {profile.foundedYear}</Tag>}
            <Tag tone="teal">{competitors.length} competitors analyzed</Tag>
          </div>
        </div>
        <div className="flex gap-3">
          <a
            href={pdfUrl(report._id)}
            className="px-6 py-3 bg-signal text-ink font-display font-bold rounded-md hover:brightness-110 transition-all"
          >
            Download PDF
          </a>
          <button onClick={onReset} className="px-5 py-3 bg-panel border border-edge rounded-md text-sm hover:border-signal transition-colors">
            New research
          </button>
        </div>
      </div>

      {/* Executive summary */}
      {executiveSummary && (
        <Section eyebrow="01" title="Executive summary">
          <p className="leading-relaxed text-paper/90 max-w-3xl">{executiveSummary}</p>
        </Section>
      )}

      {/* Overview */}
      <Section eyebrow="02" title="Company overview">
        <p className="leading-relaxed text-paper/90 max-w-3xl">{profile.overview}</p>
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <div className="bg-panel border border-edge rounded-lg p-5">
            <p className="font-mono text-[11px] tracking-wider text-fog">CORE SERVICES</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {(profile.coreServices || []).map((s) => <li key={s}>• {s}</li>)}
            </ul>
          </div>
          <div className="bg-panel border border-edge rounded-lg p-5">
            <p className="font-mono text-[11px] tracking-wider text-fog">UNIQUE SELLING POINTS</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {(profile.uniqueSellingPoints || []).map((s) => <li key={s}>• {s}</li>)}
            </ul>
          </div>
        </div>
        {profile.recentDevelopments?.length > 0 && (
          <div className="bg-panel border border-edge rounded-lg p-5 mt-4">
            <p className="font-mono text-[11px] tracking-wider text-fog">RECENT DEVELOPMENTS</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {profile.recentDevelopments.map((s) => <li key={s}>• {s}</li>)}
            </ul>
          </div>
        )}
      </Section>

      {/* Competitors */}
      <Section eyebrow="03" title="Competitor landscape">
        <div className="grid md:grid-cols-2 gap-4">
          {competitors.map((c) => (
            <article key={c.name} className="bg-panel border border-edge rounded-lg p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-display font-bold text-lg">{c.name}</h4>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  <Tag tone={c.type === "direct" ? "signal" : "fog"}>{c.type}</Tag>
                  {c.intel?.marketPosition && c.intel.marketPosition !== "unknown" && <Tag tone="teal">{c.intel.marketPosition}</Tag>}
                </div>
              </div>
              {c.website && (
                <a href={c.website} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-teal hover:underline mt-0.5 break-all">
                  {c.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              <p className="text-sm text-paper/85 mt-3">{c.summary}</p>
              {c.intel?.services?.length > 0 && (
                <p className="text-[13px] text-fog mt-3">
                  <span className="font-mono text-[10px] tracking-wider">SERVICES · </span>
                  {c.intel.services.join(" · ")}
                </p>
              )}
              {c.intel?.differentiators?.length > 0 && (
                <p className="text-[13px] text-fog mt-2">
                  <span className="font-mono text-[10px] tracking-wider">DIFFERENTIATORS · </span>
                  {c.intel.differentiators.join(" · ")}
                </p>
              )}
              {c.intel?.techStackSignals?.length > 0 && (
                <p className="text-[13px] text-fog mt-2">
                  <span className="font-mono text-[10px] tracking-wider">TECH SIGNALS · </span>
                  {c.intel.techStackSignals.join(" · ")}
                </p>
              )}
              {c.intel?.confidence && (
                <p className="font-mono text-[10px] text-fog/70 mt-auto pt-3">data confidence: {c.intel.confidence}</p>
              )}
            </article>
          ))}
        </div>
      </Section>

      {/* Pricing */}
      <Section eyebrow="04" title="Pricing comparison">
        {priced.length === 0 ? (
          <p className="text-fog text-sm">No public pricing could be confirmed for the analyzed competitors.</p>
        ) : (
          <div className="overflow-x-auto border border-edge rounded-lg">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="bg-panel font-mono text-[11px] tracking-wider text-fog text-left">
                  <th className="p-3.5 font-medium">COMPETITOR</th>
                  <th className="p-3.5 font-medium">MODEL</th>
                  <th className="p-3.5 font-medium">PLANS</th>
                </tr>
              </thead>
              <tbody>
                {priced.map((c) => (
                  <tr key={c.name} className="border-t border-edge align-top">
                    <td className="p-3.5 font-display font-medium whitespace-nowrap">{c.name}</td>
                    <td className="p-3.5 text-fog whitespace-nowrap">{c.intel.pricing.model}</td>
                    <td className="p-3.5">
                      <ul className="space-y-1">
                        {c.intel.pricing.plans.map((p) => (
                          <li key={p.name}>
                            <span className="text-paper">{p.name}</span>
                            <span className="text-signal font-mono text-[13px]"> — {p.price}</span>
                            {p.highlights?.length > 0 && <span className="text-fog text-[13px]"> · {p.highlights.join(", ")}</span>}
                          </li>
                        ))}
                      </ul>
                      {c.intel.pricing.notes && <p className="text-[12px] text-fog/80 mt-1.5">{c.intel.pricing.notes}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="font-mono text-[11px] text-fog mt-3">AI-extracted pricing — verify on competitor sites before financial decisions.</p>
      </Section>

      {/* SWOT */}
      <Section eyebrow="05" title="SWOT analysis">
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            ["Strengths", swot.strengths, "border-teal/40", "text-teal"],
            ["Weaknesses", swot.weaknesses, "border-danger/40", "text-danger"],
            ["Opportunities", swot.opportunities, "border-signal/40", "text-signal"],
            ["Threats", swot.threats, "border-edge", "text-fog"],
          ].map(([label, items, border, color]) => (
            <div key={label} className={`bg-panel border ${border} rounded-lg p-5`}>
              <p className={`font-display font-bold ${color}`}>{label}</p>
              <ul className="mt-3 space-y-2 text-sm text-paper/90">
                {(items || []).map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* Market gaps */}
      <Section eyebrow="06" title="Market gaps & opportunities">
        <div className="space-y-4">
          {marketGaps.map((g) => (
            <div key={g.gap} className="bg-panel border border-edge rounded-lg p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="font-display font-medium">{g.gap}</p>
                <Tag tone={g.opportunitySize === "high" ? "signal" : g.opportunitySize === "medium" ? "teal" : "fog"}>
                  {g.opportunitySize} opportunity
                </Tag>
              </div>
              <p className="text-sm text-fog mt-2">{g.evidence}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Recommendations */}
      <Section eyebrow="07" title="Business recommendations">
        <ol className="space-y-4">
          {recommendations.map((r, i) => (
            <li key={r.action} className="bg-panel border border-edge rounded-lg p-5 flex gap-4">
              <span className="font-mono text-signal text-sm pt-0.5">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display font-medium">{r.action}</p>
                  {r.timeframe && <Tag>{r.timeframe}</Tag>}
                </div>
                <p className="text-sm text-fog mt-1.5">{r.rationale}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <div className="mt-16 border-t border-edge pt-6 flex flex-wrap gap-3 items-center justify-between">
        <p className="font-mono text-[11px] text-fog">Generated {new Date(report.createdAt).toLocaleString()}</p>
        <a href={pdfUrl(report._id)} className="px-6 py-3 bg-signal text-ink font-display font-bold rounded-md hover:brightness-110 transition-all">
          Download PDF report
        </a>
      </div>
    </div>
  );
}
