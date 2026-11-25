import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2 } from "lucide-react";

export const SCAN_STEPS = ["Parsing document structure...", "Checking NLP perplexity & burstiness...", "Detecting AI buzzwords...", "Running ATS compatibility checks..."];

export function Uploader({
  onFile,
  onDemo,
  error,
}: {
  onFile: (f: File) => void;
  onDemo: () => void;
  error: string;
}) {
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const pick = (f?: File) => {
    if (!f) return;
    if (!/\.(pdf|docx|txt)$/i.test(f.name)) return setErr("Please upload a PDF, DOCX or TXT file.");
    if (f.size > 8 * 1024 * 1024) return setErr("File is too large (max 8 MB).");
    setErr(""); onFile(f);
  };
  return (
    <div>
      <div onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${drag ? "border-primary bg-primary/10" : "border-border hover:border-primary/60 hover:bg-muted/40"}`}>
        <FileUp className="mx-auto h-12 w-12 text-primary" />
        <p className="mt-4 text-lg font-semibold">Drop your resume here</p>
        <p className="mt-1 text-sm text-muted-foreground">or click to browse · PDF, DOCX, TXT</p>
        <input ref={ref} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {(err || error) && <p role="alert" className="mt-3 text-sm text-destructive">{err || error}</p>}
      <button onClick={onDemo} className="mt-4 w-full text-sm text-muted-foreground hover:text-primary">No resume handy? See a sample report →</button>
    </div>
  );
}

export function Scanning({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (i >= SCAN_STEPS.length) { const t = setTimeout(onDone, 300); return () => clearTimeout(t); }
    const t = setTimeout(() => setI(i + 1), 900); return () => clearTimeout(t);
  }, [i, onDone]);
  return (
    <div className="py-6">
      <h2 className="text-center text-2xl font-bold">Scanning Resume...</h2>
      <div className="mx-auto mt-6 h-2 max-w-md overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all duration-700" style={{ width: `${(i / SCAN_STEPS.length) * 100}%` }} />
      </div>
      <ul className="mx-auto mt-6 max-w-md space-y-3">
        {SCAN_STEPS.map((s, k) => (
          <li key={s} className={`flex items-center gap-3 text-sm transition ${k <= i ? "text-foreground" : "text-muted-foreground/50"}`}>
            {k < i ? <CheckCircle2 className="h-4 w-4 text-success" /> : k === i ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <span className="h-4 w-4 rounded-full border border-border" />}
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
