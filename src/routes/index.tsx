import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScanSearch } from "lucide-react";
import { LeadGate } from "@/components/jobdaddy/LeadGate";
import { Uploader, Scanning } from "@/components/jobdaddy/Uploader";
import { ReportView } from "@/components/jobdaddy/ReportView";
import {
  analyzeResume,
  demoReport,
  extractText,
  ResumeReadError,
  type Report,
} from "@/lib/resume-analyzer";
import { clearLead, loadLead, saveLead, sendLead, type Lead } from "@/lib/leads";
import { profileFromResumeText } from "@/lib/career/from-resume";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Resume Detector & ATS Audit — JobDaddy" },
      { name: "description", content: "Free AI resume detector: find robotic ChatGPT phrases, get your ATS & human score, and fix what recruiters reject." },
      { property: "og:title", content: "Is your resume flagged as AI? — JobDaddy" },
      { property: "og:description", content: "Scan your resume free. Get an ATS & human score and see the AI clichés recruiters skip." },
    ],
  }),
  component: Index,
});

type Stage = "gate" | "upload" | "scanning" | "report";

function Index() {
  const [lead, setLead] = useState<Lead | null>(null);
  const [stage, setStage] = useState<Stage>("gate");
  const [report, setReport] = useState<Report | null>(null);
  const [scanError, setScanError] = useState("");
  const pending = useRef<Promise<Report> | null>(null);

  useEffect(() => {
    const l = loadLead();
    if (l) {
      setLead(l);
      setStage("upload");
    }
  }, []);

  const verified = (l: Lead) => {
    saveLead(l);
    setLead(l);
    setStage("upload");
  };
  const start = (p: Promise<Report>) => {
    p.catch(() => {}); // the error is handled in `finish`; avoid an "unhandled rejection" warning
    pending.current = p;
    setScanError("");
    setStage("scanning");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const onFile = (f: File) => start(extractText(f).then((t) => ({ ...analyzeResume(t), text: t })));
  const finish = useCallback(async () => {
    try {
      const res = await (pending.current ?? Promise.resolve(demoReport()));
      setReport(res);
      setStage("report");

      // Send full resume analysis results to your Google Sheet webhook
      if (lead && !res.demo) {
        const extracted = res.text ? profileFromResumeText(res.text).profile : null;
        void sendLead({
          ...lead,
          timestamp: new Date().toISOString(),
          score: res.score,
          aiPercent: res.aiPercent,
          wordCount: res.wordCount,
          metrics: res.metrics,
          flags: res.flags.map((f) => `${f.phrase} (${f.count})`),
          skills: extracted?.skills.hard ?? [],
          targetRole: lead.targetRole,
          preferredRole: lead.preferredRole,
        });
      }
    } catch (e) {
      setScanError(
        e instanceof ResumeReadError
          ? e.message
          : "Something went wrong while scanning your resume. Please try again.",
      );
      setStage("upload");
    }
  }, [lead]);
  const reset = () => {
    setReport(null);
    setScanError("");
    setStage("upload");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background bg-hero">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <a href="https://jobdaddy.in" target="_blank" rel="noreferrer" className="font-display text-xl font-bold">Job<span className="text-primary">Daddy</span></a>
        {lead && <div className="text-right text-xs text-muted-foreground">Hi, {lead.name.split(" ")[0]} · <button className="hover:text-foreground" onClick={() => { clearLead(); setLead(null); setStage("gate"); }}>Not you?</button></div>}
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-20">
        {stage !== "report" && (
          <section className="mx-auto max-w-2xl pt-6 text-center md:pt-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"><ScanSearch className="h-3.5 w-3.5" /> AI Resume Detector & Audit</span>
            <h1 className="mt-5 text-4xl font-bold leading-tight md:text-6xl">Does your resume sound like <span className="text-primary">ChatGPT</span>?</h1>
            <p className="mt-4 text-muted-foreground md:text-lg">Recruiters spot AI-written resumes in seconds. Get your ATS & human score free.</p>
          </section>
        )}
        <div className={`mx-auto mt-10 ${stage === "report" ? "max-w-5xl" : "max-w-md"}`}>
          {stage === "report" && report ? <ReportView report={report} onReset={reset} /> : (
            <div className="rounded-2xl border border-border bg-card/90 p-6 shadow-2xl backdrop-blur md:p-8">
              {stage === "gate" && <LeadGate onVerified={verified} />}
              {stage === "upload" && <Uploader error={scanError} onFile={onFile} onDemo={() => start(Promise.resolve(demoReport()))} />}
              {stage === "scanning" && <Scanning onDone={finish} />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}