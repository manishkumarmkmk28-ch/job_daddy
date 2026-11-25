import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { CandidateProfileSchema } from "../schema/profile.js";
import { extractFields } from "../parser/extract.js";
import { classifyField } from "../parser/classify.js";
import { fillStandardFields, fillControl, type FillResult } from "../filler/fill.js";
import { answerSubjective } from "../llm/answers.js";
import { GeminiClient, MockLLM, OpenAIClient } from "../llm/clients.js";
import type { LLMClient } from "../llm/types.js";

export interface DryRunReport { results: FillResult[]; tokens: { input: number; output: number; total: number }; submitted: false }

export function pickClient(): LLMClient {
  if (process.env.GEMINI_API_KEY) return new GeminiClient();
  if (process.env.OPENAI_API_KEY) return new OpenAIClient();
  return new MockLLM();
}

/**
 * End-to-end dry run (roadmap Day 8): open a job page, parse, fill standard fields, answer subjective ones with the LLM,
 * and STOP. This function has no code path that clicks a submit button.
 */
export async function dryRun(url: string, profileJson: unknown, client: LLMClient, jobDescription = ""): Promise<DryRunReport> {
  const profile = CandidateProfileSchema.parse(profileJson);
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext()).newPage();
    await page.goto(url);
    const fields = await extractFields(page);
    const results = await fillStandardFields(page, profile, fields, classifyField);

    const pending = results.filter((r) => r.status === "needs-ai");
    const questions = pending.map((r, i) => ({
      id: `q${i + 1}`, question: r.classification.type === "subjective" ? r.classification.question : "", maxLength: r.field.maxLength,
    }));
    const ans = await answerSubjective(client, profile, questions, jobDescription);
    for (let i = 0; i < pending.length; i++) {
      const a = ans.answers[`q${i + 1}`];
      if (a?.text) {
        try { await fillControl(page, pending[i].field, a.text); pending[i].status = "filled"; pending[i].value = a.text; pending[i].detail = `ai:${a.source}`; }
        catch (e) { pending[i].status = "error"; pending[i].detail = (e as Error).message; }
      } else pending[i].detail = "needs human answer";
    }
    return { results, tokens: ans.tokens, submitted: false };
  } finally {
    await browser.close();
  }
}

if (process.argv[1]?.endsWith("dryrun.ts")) {
  const target = process.argv[2] ?? pathToFileURL(resolve("tests/fixtures/greenhouse.html")).href;
  const profile = JSON.parse(readFileSync("data/candidate_profile.sample.json", "utf8"));
  profile.resumePath = resolve("data/resume.pdf");
  const rep = await dryRun(target, profile, pickClient(), "Backend engineer building payments APIs.");
  for (const r of rep.results)
    console.log(`${r.tier.padEnd(5)} ${r.status.padEnd(16)} ${(r.field.label || r.field.name).slice(0, 48).padEnd(50)} ${r.value?.slice(0, 40) ?? r.detail ?? ""}`);
  console.log("tokens", rep.tokens, "submitted:", rep.submitted);
}
