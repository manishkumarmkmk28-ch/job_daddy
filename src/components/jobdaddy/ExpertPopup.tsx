import { useState } from "react";
import { Sparkles, X, MessageSquare } from "lucide-react";

export function ExpertPopup({ onDismiss }: { onDismiss: () => void }) {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-primary/40 bg-card p-6 shadow-2xl md:p-8 text-center">
        <button
          onClick={() => { setOpen(false); onDismiss(); }}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
          <Sparkles className="h-6 w-6" />
        </div>

        <span className="inline-block rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive mb-3">
          High Rejection Risk Detected
        </span>

        <h3 className="text-2xl font-bold tracking-tight">
          Did you know <span className="text-destructive">75% of AI-made resumes</span> are rejected instantly?
        </h3>

        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Robotic phrasing and generic buzzwords get filtered out before a human ever sees your application. Let our expert career writers rebuild your resume from scratch to guarantee ATS compliance.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row justify-center">
          <a
            href="https://wa.me/?text=Hi,%20I%20want%20JobDaddy%20experts%20to%20rewrite%20my%20resume."
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:brightness-110"
          >
            <MessageSquare className="h-4 w-4" /> Chat with an Expert on WhatsApp
          </a>
          <button
            onClick={() => { setOpen(false); onDismiss(); }}
            className="rounded-xl border border-border bg-transparent px-5 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition"
          >
            Continue with Free Report
          </button>
        </div>
      </div>
    </div>
  );
}