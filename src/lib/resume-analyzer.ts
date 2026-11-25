export const AI_PHRASES = [
  "delved into", "delve into", "delving", "testament to", "spearheaded", "synergies", "synergy",
  "meticulous", "fast-paced environment", "results-driven", "dynamic professional", "passionate about",
  "leveraged", "leveraging", "seamlessly", "robust", "cutting-edge", "game-changer", "tapestry",
  "proven track record", "go-getter", "think outside the box", "detail-oriented", "team player",
  "strategic thinker", "innovative solutions", "navigate the complexities", "ever-evolving",
  "holistic", "orchestrated", "pivotal role", "fostered", "harnessed", "elevate", "empower",
];

export const DEMO_FLAGS = [
  "Delved into", "Testament to", "Spearheaded cross-functional synergies", "Meticulous professional", "Fast-paced environment",
];

export type Flag = { phrase: string; count: number; severity: "high" | "medium" };
export type Report = {
  score: number; aiPercent: number; flags: Flag[]; issues: string[]; strengths: string[];
  wordCount: number; metrics: number; demo: boolean;
  /** Extracted resume text, kept so the profile / keyword panel can reuse it. */
  text?: string;
};

export class ResumeReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeReadError";
  }
}

export function analyzeResume(text: string): Report {
  const clean = text.replace(/\s+/g, " ").trim();
  const lower = clean.toLowerCase();
  const words = clean ? clean.split(" ") : [];
  if (words.length < 40) {
    throw new ResumeReadError(
      "We couldn't find enough readable text in this file. If it's a scanned or image-based PDF, export a text-based PDF or upload a DOCX/TXT instead.",
    );
  }

  const flags: Flag[] = [];
  for (const p of AI_PHRASES) {
    const count = lower.split(p).length - 1;
    if (count > 0) flags.push({ phrase: p.replace(/^\w/, (c) => c.toUpperCase()), count, severity: count > 1 || p.length > 14 ? "high" : "medium" });
  }
  const metrics = (
    clean.match(
      /\d+(?:\.\d+)?\s?(?:%|\+|(?:x|k|cr|crore|lakhs?|million|m|bn|billion)\b)|₹\s?\d|\$\s?\d/gi,
    ) || []
  ).length;
  const sentences = clean.split(/[.!?•\n]/).map((s) => s.trim().split(" ").length).filter((n) => n > 3);
  const avg = sentences.reduce((a, b) => a + b, 0) / Math.max(1, sentences.length);
  const variance = sentences.reduce((a, b) => a + (b - avg) ** 2, 0) / Math.max(1, sentences.length);
  const burstiness = Math.sqrt(variance) / Math.max(1, avg); // low = robotic

  const flagHits = flags.reduce((a, f) => a + f.count, 0);
  let aiPercent = 20 + flagHits * 7 + (burstiness < 0.35 ? 18 : burstiness < 0.5 ? 8 : 0) + (metrics < 3 ? 15 : 0);
  aiPercent = Math.min(96, Math.max(12, Math.round(aiPercent)));
  const score = Math.max(8, Math.min(98, Math.round(100 - aiPercent * 0.75 + Math.min(metrics, 8) * 2 - 6)));

  const issues: string[] = [];
  if (metrics < 3) issues.push("Very few measurable results — recruiters look for numbers (%, ₹, team size, time saved).");
  if (flagHits > 2) issues.push(`${flagHits} robotic buzzwords detected — these are classic ChatGPT fingerprints recruiters recognise instantly.`);
  if (burstiness < 0.5) issues.push("Uniform sentence length and rhythm — low 'burstiness' reads as machine-written.");
  if (words.length > 900) issues.push("Resume is too long — ATS parsers and recruiters prefer 1–2 focused pages.");
  if (words.length < 200) issues.push("Too little content — ATS may not find enough keywords to rank you.");
  if (!/experience|work history/i.test(clean)) issues.push("No clear 'Experience' heading — ATS may fail to parse your work history.");
  if (!issues.length) issues.push("Generic template patterns reduce how memorable your profile is.");

  const strengths: string[] = [];
  if (metrics >= 3) strengths.push(`${metrics} quantified achievements found`);
  if (burstiness >= 0.5) strengths.push("Natural, human sentence variation");
  if (flagHits <= 2) strengths.push("Low buzzword density");

  return { score, aiPercent, flags: flags.sort((a, b) => b.count - a.count), issues, strengths, wordCount: words.length, metrics, demo: false };
}

export function demoReport(): Report {
  return {
    score: 42, aiPercent: 78, demo: true, wordCount: 0, metrics: 1,
    flags: DEMO_FLAGS.map((phrase, i) => ({ phrase, count: i < 2 ? 2 : 1, severity: i < 3 ? "high" : "medium" })),
    issues: [
      "Lack of measurable metrics — no revenue, %, or team-size numbers backing your claims.",
      "Robotic syntax — sentences follow the same length and structure, a strong AI signal.",
      "Generic template patterns — summary reads like thousands of other applications.",
      "Buzzword stacking dilutes the real keywords ATS systems rank on.",
    ],
    strengths: [],
  };
}

export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith(".txt")) return await file.text();

    if (name.endsWith(".docx")) {
      const mod = await import("mammoth");
      // mammoth is CommonJS: depending on the bundler the API is on the namespace or on `default`.
      const mammoth: typeof mod = (mod as unknown as { default?: typeof mod }).default ?? mod;
      const res = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return res.value;
    }

    if (name.endsWith(".pdf")) {
      const pdfjs = await import("pdfjs-dist");
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
        .promise;
      try {
        const pages: string[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          pages.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
        }
        return pages.join("\n");
      } finally {
        await doc.destroy();
      }
    }
  } catch (e) {
    if (e instanceof Error && e.name === "PasswordException") {
      throw new ResumeReadError("This PDF is password-protected. Remove the password and try again.");
    }
    console.error("Resume extraction failed", e);
    throw new ResumeReadError(
      "We couldn't open this file. Try re-exporting it as a PDF or DOCX, or upload a TXT.",
    );
  }
  throw new ResumeReadError("Please upload a PDF, DOCX or TXT file.");
}
