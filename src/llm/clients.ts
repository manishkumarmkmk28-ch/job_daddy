import type { LLMClient, LLMResponse } from "./types.js";

/** Offline stub for tests and dry-runs without API keys. */
export class MockLLM implements LLMClient {
  name = "mock";
  calls = 0;
  async complete(_s: string, user: string): Promise<LLMResponse> {
    this.calls++;
    const ids = [...user.matchAll(/^(q\d+)(?: \(max \d+\))?:/gm)].map((m) => m[1]);
    const text = JSON.stringify(Object.fromEntries(ids.map((id) => [id, `[mock answer for ${id}]`])));
    return { text, inputTokens: Math.ceil(user.length / 4), outputTokens: Math.ceil(text.length / 4) };
  }
}

/** OpenAI-compatible chat endpoint (GPT-4o-mini). Not exercised in the sandbox - needs OPENAI_API_KEY. */
export class OpenAIClient implements LLMClient {
  name = "gpt-4o-mini";
  constructor(private key = process.env.OPENAI_API_KEY ?? "") {}
  async complete(system: string, user: string, max: number): Promise<LLMResponse> {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.key}` },
      body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: max, temperature: 0.2, response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}`);
    const j: any = await r.json();
    return { text: j.choices[0].message.content, inputTokens: j.usage.prompt_tokens, outputTokens: j.usage.completion_tokens };
  }
}

/** Gemini REST. Model id is configurable because 1.5 Flash is being retired. Needs GEMINI_API_KEY. */
export class GeminiClient implements LLMClient {
  name: string;
  constructor(private model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash", private key = process.env.GEMINI_API_KEY ?? "") { this.name = model; }
  async complete(system: string, user: string, max: number): Promise<LLMResponse> {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.key}`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: max, temperature: 0.2, responseMimeType: "application/json" } }),
    });
    if (!r.ok) throw new Error(`Gemini ${r.status}`);
    const j: any = await r.json();
    return { text: j.candidates[0].content.parts[0].text, inputTokens: j.usageMetadata.promptTokenCount, outputTokens: j.usageMetadata.candidatesTokenCount };
  }
}
