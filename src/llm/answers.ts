import { z } from "zod";
import type { CandidateProfile } from "../schema/profile.js";
import type { AnswerResult, LLMClient, SubjectiveQuestion } from "./types.js";

/** Hard per-application cap from the PRD (§2.3): total input + output tokens < 1,500. */
export const TOKEN_BUDGET = 1500;
const MAX_OUTPUT_TOKENS = 450;

/** Cheap token estimate (~4 chars/token) used to trim context before sending. */
export const estimateTokens = (s: string) => Math.ceil(s.length / 4);

export const normalizeQuestion = (q: string) =>
  q.toLowerCase().replace(/\*/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

const SYSTEM =
  'You fill job application questions for a candidate. Use ONLY the candidate facts given; never invent employers, numbers or skills. ' +
  'Be concise, first person, plain text. Respect each "max" character limit. ' +
  'Reply with JSON only: {"<id>":"<answer>", ...}';

export function profileFacts(p: CandidateProfile): string {
  const cur = p.experience.find((e) => e.endDate === null) ?? p.experience[0];
  const skills = [...p.skills.hard, ...p.skills.frameworks].slice(0, 12).join(", ");
  const ach = p.experience.flatMap((e) => e.achievements).slice(0, 3).join("; ");
  return [
    `Name: ${p.contact.fullName}`,
    cur ? `Role: ${cur.title} at ${cur.employer}` : "",
    p.education[0] ? `Education: ${p.education[0].degree} ${p.education[0].field}, ${p.education[0].institution}` : "",
    skills ? `Skills: ${skills}` : "",
    ach ? `Achievements: ${ach}` : "",
    p.workAuth.noticePeriodDays !== undefined ? `Notice: ${p.workAuth.noticePeriodDays} days` : "",
  ].filter(Boolean).join("\n");
}

const ReplySchema = z.record(z.string(), z.string());

function parseReply(text: string) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("LLM reply had no JSON object");
  return ReplySchema.parse(JSON.parse(m[0]));
}

/**
 * Answer all subjective questions of one application in a single LLM call.
 * 1. Reuse qaCache hits (zero tokens).  2. Trim job description until the prompt fits the budget.
 * 3. One batched call, JSON out.  4. Newly generated answers are NOT auto-cached - the user must approve them first.
 */
export async function answerSubjective(
  client: LLMClient, profile: CandidateProfile, questions: SubjectiveQuestion[], jobDescription = "",
): Promise<AnswerResult> {
  const out: AnswerResult = { answers: {}, tokens: { input: 0, output: 0, total: 0 } };
  const todo: SubjectiveQuestion[] = [];
  for (const q of questions) {
    const hit = profile.qaCache[normalizeQuestion(q.question)];
    if (hit !== undefined) out.answers[q.id] = { text: hit, source: "cache" };
    else todo.push(q);
  }
  if (!todo.length) return out;

  const qBlock = todo.map((q) => `${q.id}${q.maxLength ? ` (max ${q.maxLength})` : ""}: ${q.question}`).join("\n");
  const facts = profileFacts(profile);
  const fixed = estimateTokens(SYSTEM) + estimateTokens(facts) + estimateTokens(qBlock) + 20;
  const jdRoom = Math.max(0, TOKEN_BUDGET - MAX_OUTPUT_TOKENS - fixed);
  const jd = jobDescription.slice(0, jdRoom * 4);
  const user = `Job:\n${jd}\n\nCandidate:\n${facts}\n\nQuestions:\n${qBlock}`;

  if (estimateTokens(SYSTEM) + estimateTokens(user) + MAX_OUTPUT_TOKENS > TOKEN_BUDGET) {
    for (const q of todo) out.answers[q.id] = { text: "", source: "fallback" }; // too many questions: hand to the human
    return out;
  }

  const res = await client.complete(SYSTEM, user, MAX_OUTPUT_TOKENS);
  out.tokens = { input: res.inputTokens, output: res.outputTokens, total: res.inputTokens + res.outputTokens };
  let parsed: Record<string, string> = {};
  try { parsed = parseReply(res.text); } catch { /* leave empty -> fallback below */ }
  for (const q of todo) {
    let t = (parsed[q.id] ?? "").trim();
    if (q.maxLength && t.length > q.maxLength) t = t.slice(0, q.maxLength);
    out.answers[q.id] = { text: t, source: t ? "llm" : "fallback" }; // empty = user must write it (amber)
  }
  return out;
}
