import { useEffect, useRef, useState } from "react";
import InputForm from "./components/InputForm.jsx";
import PipelineTracker from "./components/PipelineTracker.jsx";
import ReportView from "./components/ReportView.jsx";
import { startReport, getReport, getHealth } from "./lib/api.js";

export default function App() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [health, setHealth] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    getHealth().then(setHealth).catch(() => {});
    return () => clearInterval(pollRef.current);
  }, []);

  const beginPolling = (id) => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const latest = await getReport(id);
        setReport(latest);
        if (latest.status === "completed" || latest.status === "failed") {
          clearInterval(pollRef.current);
        }
      } catch {
        /* keep polling */
      }
    }, 2500);
  };

  const handleStart = async (input) => {
    setError("");
    setStarting(true);
    try {
      const { id } = await startReport(input);
      const initial = await getReport(id);
      setReport(initial);
      beginPolling(id);
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  const reset = () => {
    clearInterval(pollRef.current);
    setReport(null);
    setError("");
  };

  const running = report && (report.status === "queued" || report.status === "running");
  const completed = report?.status === "completed";
  const failed = report?.status === "failed";

  return (
    <div className="min-h-screen">
      <header className="border-b border-edge">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <button onClick={reset} className="text-left">
            <p className="font-mono text-[11px] tracking-[0.25em] text-teal">MARKET RESEARCH · AUTOMATED</p>
            <h1 className="font-display font-bold text-xl">BI<span className="text-signal">/</span>Agent</h1>
          </button>
          {health && (
            <div className="font-mono text-[11px] text-fog text-right hidden sm:block">
              <p>AI: {health.geminiConfigured ? <span className="text-teal">connected</span> : <span className="text-danger">no API key</span>}</p>
              <p>store: {health.database}</p>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-24">
        {!report && (
          <InputForm onStart={handleStart} starting={starting} error={error} health={health} />
        )}

        {running && <PipelineTracker report={report} />}

        {failed && (
          <div className="mt-16 max-w-xl mx-auto">
            <PipelineTracker report={report} />
            <div className="mt-6 border border-danger/40 bg-danger/10 rounded-lg p-5">
              <p className="font-display font-bold text-danger">Research run failed</p>
              <p className="text-sm text-paper/80 mt-1 font-mono">{report.error}</p>
              <button onClick={reset} className="mt-4 px-4 py-2 bg-panel border border-edge rounded-md text-sm hover:border-signal transition-colors">
                Start a new run
              </button>
            </div>
          </div>
        )}

        {completed && <ReportView report={report} onReset={reset} />}
      </main>
    </div>
  );
}
