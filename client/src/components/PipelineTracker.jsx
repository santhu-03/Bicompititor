export default function PipelineTracker({ report }) {
  const stages = report.stages || [];
  const done = stages.filter((s) => s.status === "done").length;

  return (
    <section className="pt-16 max-w-xl mx-auto">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-signal">CASE FILE · IN PROGRESS</p>
          <h2 className="font-display font-bold text-2xl mt-2">
            {report.data?.profile?.name || report.input?.company || report.input?.website}
          </h2>
        </div>
        <p className="font-mono text-sm text-fog">{done}/{stages.length}</p>
      </div>

      <ol className="mt-10 relative">
        <div className="absolute left-[9px] top-2 bottom-2 w-px dossier-line" aria-hidden="true" />
        {stages.map((stage) => (
          <li key={stage.key} className="relative pl-10 pb-8 last:pb-0">
            <span
              className={
                "absolute left-0 top-1 h-[19px] w-[19px] rounded-full border-2 flex items-center justify-center " +
                (stage.status === "done"
                  ? "bg-teal border-teal"
                  : stage.status === "running"
                  ? "bg-signal border-signal stage-running"
                  : stage.status === "error"
                  ? "bg-danger border-danger"
                  : "bg-ink border-edge")
              }
            >
              {stage.status === "done" && (
                <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-ink" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M2 6.5 5 9l5-6" />
                </svg>
              )}
            </span>
            <p
              className={
                "font-display font-medium " +
                (stage.status === "pending" ? "text-fog/60" : stage.status === "error" ? "text-danger" : "text-paper")
              }
            >
              {stage.label}
            </p>
            {stage.detail && stage.status !== "pending" && (
              <p className="font-mono text-[12px] text-fog mt-1">{stage.detail}</p>
            )}
          </li>
        ))}
      </ol>

      <p className="mt-10 font-mono text-[11px] text-fog text-center">
        Scraping and AI analysis run server-side — you can leave this tab open.
      </p>
    </section>
  );
}
