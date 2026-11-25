import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CandidateProfileSchema } from "../src/schema/profile.js";
import { answerSubjective, normalizeQuestion, TOKEN_BUDGET } from "../src/llm/answers.js";
import { MockLLM } from "../src/llm/clients.js";
import type { LLMClient } from "../src/llm/types.js";

const base = JSON.parse(readFileSync("data/candidate_profile.sample.json", "utf8"));

test("cache hit costs zero tokens and zero calls", async () => {
  const p = CandidateProfileSchema.parse({ ...base, qaCache: { [normalizeQuestion("Why do you want to work here? *")]: "Because X." } });
  const llm = new MockLLM();
  const r = await answerSubjective(llm, p, [{ id: "q1", question: "Why do you want to work here? *" }]);
  assert.equal(r.answers.q1.text, "Because X.");
  assert.equal(r.answers.q1.source, "cache");
  assert.equal(llm.calls, 0);
});

test("one batched call; huge job description is trimmed to stay under budget", async () => {
  const p = CandidateProfileSchema.parse(base);
  let sent = "";
  const spy: LLMClient = { name: "spy", async complete(s, u) { sent = s + u; return { text: '{"q1":"a","q2":"b"}', inputTokens: 1, outputTokens: 1 }; } };
  await answerSubjective(spy, p, [{ id: "q1", question: "Why us?" }, { id: "q2", question: "Proud project?" }], "x".repeat(50_000));
  assert.ok(Math.ceil(sent.length / 4) + 450 <= TOKEN_BUDGET, `prompt too big: ${sent.length}`);
});

test("too many questions to fit the budget are handed to the human, not sent", async () => {
  const p = CandidateProfileSchema.parse(base);
  const llm = new MockLLM();
  const qs = Array.from({ length: 40 }, (_, i) => ({ id: `q${i}`, question: "Explain in detail ".repeat(10) + i }));
  const r = await answerSubjective(llm, p, qs);
  assert.equal(llm.calls, 0);
  assert.ok(Object.values(r.answers).every((a) => a.source === "fallback" && a.text === ""));
});

test("bad JSON from the model falls back to empty (amber) answers; maxLength is enforced", async () => {
  const p = CandidateProfileSchema.parse(base);
  const bad: LLMClient = { name: "bad", async complete() { return { text: "sorry!", inputTokens: 1, outputTokens: 1 }; } };
  assert.equal((await answerSubjective(bad, p, [{ id: "q1", question: "Why?" }])).answers.q1.source, "fallback");
  const long: LLMClient = { name: "long", async complete() { return { text: '{"q1":"' + "a".repeat(500) + '"}', inputTokens: 1, outputTokens: 1 }; } };
  assert.equal((await answerSubjective(long, p, [{ id: "q1", question: "Why?", maxLength: 100 }])).answers.q1.text.length, 100);
});
