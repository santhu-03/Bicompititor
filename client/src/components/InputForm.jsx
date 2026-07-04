import { useState } from "react";

export default function InputForm({ onStart, starting, error, health }) {
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [region, setRegion] = useState("");
  const [localError, setLocalError] = useState("");

  const submit = () => {
    if (!company.trim() && !website.trim()) {
      setLocalError("Enter a company name, a website, or both.");
      return;
    }
    setLocalError("");
    onStart({ company, website, industry, region });
  };

  const inputClass =
    "w-full bg-panel border border-edge rounded-md px-4 py-3 text-sm placeholder:text-fog/60 focus:outline-none focus:border-signal focus:ring-1 focus:ring-signal/40 transition-colors";

  return (
    <section className="pt-16 sm:pt-24 max-w-2xl mx-auto">
      <p className="font-mono text-xs tracking-[0.3em] text-signal">CASE FILE · NEW</p>
      <h2 className="font-display font-bold text-4xl sm:text-5xl mt-3 leading-tight">
        Open a dossier on any company.
      </h2>
      <p className="text-fog mt-4 leading-relaxed">
        The agent profiles the company, discovers direct and indirect competitors, scrapes their sites,
        compares services and pricing, runs a SWOT, and hands you a PDF — in minutes.
      </p>

      {health && !health.groqConfigured && (
        <div className="mt-6 border border-signal/40 bg-signal/10 rounded-lg p-4 text-sm">
          <span className="font-semibold text-signal">Setup needed:</span>{" "}
          Add your <code className="font-mono">GROQ_API_KEY</code> to <code className="font-mono">server/.env</code> and restart the server.
        </div>
      )}

      <div className="mt-10 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="company" className="font-mono text-[11px] text-fog tracking-wider">COMPANY NAME</label>
            <input id="company" className={inputClass + " mt-1"} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Notion" />
          </div>
          <div>
            <label htmlFor="website" className="font-mono text-[11px] text-fog tracking-wider">WEBSITE (OPTIONAL)</label>
            <input id="website" className={inputClass + " mt-1"} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="notion.so" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="industry" className="font-mono text-[11px] text-fog tracking-wider">INDUSTRY HINT (OPTIONAL)</label>
            <input id="industry" className={inputClass + " mt-1"} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. productivity software" />
          </div>
          <div>
            <label htmlFor="region" className="font-mono text-[11px] text-fog tracking-wider">REGION FOCUS (OPTIONAL)</label>
            <input id="region" className={inputClass + " mt-1"} value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. India, global" />
          </div>
        </div>

        {(localError || error) && (
          <p className="text-danger text-sm font-mono">{localError || error}</p>
        )}

        <button
          onClick={submit}
          disabled={starting}
          className="w-full sm:w-auto px-8 py-3.5 bg-signal text-ink font-display font-bold rounded-md hover:brightness-110 disabled:opacity-50 disabled:cursor-wait transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          {starting ? "Opening dossier…" : "Start research"}
        </button>
        <p className="font-mono text-[11px] text-fog">Typical run: 2–4 minutes · 6 research stages</p>
      </div>
    </section>
  );
}
