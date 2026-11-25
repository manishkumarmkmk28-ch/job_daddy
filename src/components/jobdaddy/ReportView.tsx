import { useState } from "react";
import { AlertTriangle, CheckCircle2, MessageCircle, RotateCcw, Rocket, XCircle } from "lucide-react";
import type { Report } from "@/lib/resume-analyzer";
import { ProfilePanel } from "./ProfilePanel";
import { ExpertPopup } from "./ExpertPopup";

const JOBDADDY_URL = "https://www.jobdaddy.in/career-services";
const WHATSAPP_URL = "https://wa.me/918800614884?text=" + encodeURIComponent("Hi JobDaddy, my resume was flagged as AI-generated. I want help with Launchpad.");

function Gauge({ score }: { score: number }) {
  const r = 70, c = 2 * Math.PI * r, tone = score < 50 ? "text-destructive" : score < 75 ? "text-warning" : "text-success";
  const label = score < 50 ? "High AI Risk" : score < 75 ? "Moderate Risk" : "Human-Optimized";
  return (
    <div className="relative mx-auto h-44 w-44">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={r} strokeWidth="12" className="fill-none stroke-muted" />
        <circle cx="80" cy="80" r={r} strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
          className={`fill-none stroke-current ${tone} transition-all duration-1000`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-5xl font-bold">{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
        <span className={`mt-1 text-xs font-semibold ${tone}`}>{label}</span>
      </div>
    </div>
  );
}

export function ReportView({ report, onReset }: { report: Report; onReset: () => void }) {
  const [showExpertModal, setShowExpertModal] = useState(true);
  const card = "rounded-2xl border border-border bg-card p-6";

  return (
    <div className="space-y-6">
      {showExpertModal && <ExpertPopup onDismiss={() => setShowExpertModal(false)} />}
      
      {report.demo && <p className="rounded-lg bg-muted px-4 py-2 text-center text-xs text-muted-foreground">Sample report — upload a text-based resume for a personalised scan.</p>}
      
      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <div className={`${card} text-center`}>
          <p className="mb-3 text-sm font-medium text-muted-foreground">ATS & Human Score</p>
          <Gauge score={report.score} />
          <p className="mt-4 text-sm"><span className="font-bold text-destructive">{report.aiPercent}%</span> AI-generated probability</p>
        </div>
        <div className={card}>
          <h3 className="flex items-center gap-2 text-lg font-bold"><AlertTriangle className="h-5 w-5 text-warning" /> AI Keywords & Clichés</h3>
          {report.flags.length === 0 ? <p className="mt-4 text-sm text-success">No common AI clichés found. Nice.</p> : (
            <ul className="mt-4 flex flex-wrap gap-2">
              {report.flags.map((f) => (
                <li key={f.phrase} className={`rounded-full border px-3 py-1.5 text-sm font-medium ${f.severity === "high" ? "border-destructive/50 bg-destructive/15 text-destructive" : "border-warning/50 bg-warning/15 text-warning"}`}>
                  "{f.phrase}" {f.count > 1 && <span className="opacity-70">×{f.count}</span>}
                </li>
              ))}
            </ul>
          )}
          {report.strengths.length > 0 && (
            <ul className="mt-5 space-y-1.5">
              {report.strengths.map((s) => <li key={s} className="flex items-center gap-2 text-sm text-success"><CheckCircle2 className="h-4 w-4" />{s}</li>)}
            </ul>
          )}
        </div>
      </div>
      
      <div className={card}>
        <h3 className="text-lg font-bold">Why recruiters & ATS reject this</h3>
        <ul className="mt-4 space-y-3">
          {report.issues.map((s) => <li key={s} className="flex gap-3 text-sm text-muted-foreground"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />{s}</li>)}
        </ul>
      </div>

      {report.text && !report.demo && <ProfilePanel text={report.text} />}

      <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-card p-8 text-center shadow-glow">
        <div className="pointer-events-none absolute inset-0 bg-hero" />
        <div className="relative">
          <h2 className="text-2xl font-bold md:text-3xl">
            {report.aiPercent >= 50
              ? `🚨 Your resume is currently flagged as ${report.aiPercent}% AI-Generated. Recruiters skip these in under 3 seconds.`
              : `Your resume reads mostly human (${report.aiPercent}% AI signals). Let's make it impossible to ignore.`}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Stop sending your applications into a digital black hole. Let JobDaddy's expert recruiters rebuild your profile from scratch.</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href={JOBDADDY_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:brightness-110">
              <Rocket className="h-4 w-4" /> Upgrade Your Career with JobDaddy Launchpad
            </a>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-accent/60 px-5 py-3 font-medium text-accent transition hover:bg-accent/10">
              <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
            </a>
          </div>
          <button onClick={onReset} className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><RotateCcw className="h-4 w-4" /> Try Another Resume</button>
        </div>
      </div>
    </div>
  );
}