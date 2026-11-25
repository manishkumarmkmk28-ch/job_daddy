import { z } from "zod";
import type { LLMClient } from "../llm/types.js";

export const JobDescriptionSchema = z.object({
  jobTitle: z.string().describe("Title of the job position"),
  companyName: z.string().optional().describe("Name of the hiring company, if mentioned"),
  requiredSkills: z.array(z.string()).describe("List of mandatory technical and soft skills"),
  experienceYears: z.object({
    min: z.number().optional(),
    max: z.number().optional()
  }).describe("Required years of experience"),
  keyResponsibilities: z.array(z.string()).describe("Core duties and responsibilities"),
  qualifications: z.array(z.string()).describe("Education or certification requirements")
});

export type JobDescription = z.infer<typeof JobDescriptionSchema>;

const SYSTEM_PROMPT = `Extract structured information from the Job Description text.
Return ONLY valid JSON matching:
{
  "jobTitle": "string",
  "companyName": "string (optional)",
  "requiredSkills": ["string"],
  "experienceYears": { "min": number, "max": number },
  "keyResponsibilities": ["string"],
  "qualifications": ["string"]
}`;

export async function parseJobDescription(rawText: string, client: LLMClient): Promise<JobDescription> {
  const res = await client.complete(SYSTEM_PROMPT, rawText.slice(0, 12000), 600);
  const match = res.text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Failed to extract JSON from JD parser LLM response");
  return JobDescriptionSchema.parse(JSON.parse(match[0]));
}
