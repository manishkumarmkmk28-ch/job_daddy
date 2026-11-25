export interface LLMResponse { text: string; inputTokens: number; outputTokens: number }
export interface LLMClient { name: string; complete(system: string, user: string, maxOutputTokens: number): Promise<LLMResponse> }
export interface SubjectiveQuestion { id: string; question: string; maxLength?: number }
export interface AnswerResult {
  answers: Record<string, { text: string; source: "cache" | "llm" | "fallback" }>;
  tokens: { input: number; output: number; total: number };
}
