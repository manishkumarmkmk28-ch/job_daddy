import type { Classification, FieldDescriptor, ProfileKey } from "./types.js";

interface Rule { key: ProfileKey; re: RegExp; kinds?: string[] }

// Ordered: more specific rules first. Each regex is scored against name/id/placeholder/label.
const RULES: Rule[] = [
  { key: "resume", re: /resume|\bcv\b|curriculum/i, kinds: ["file"] },
  { key: "firstName", re: /first[\s_-]*name|given[\s_-]*name|fname/i },
  { key: "lastName", re: /last[\s_-]*name|sur[\s_-]*name|family[\s_-]*name|lname/i },
  { key: "email", re: /e-?mail/i },
  { key: "phone", re: /phone|mobile|\btel\b|contact number/i },
  { key: "linkedin", re: /linked[\s_-]*in/i },
  { key: "github", re: /git[\s_-]*hub/i },
  { key: "twitter", re: /twitter|\bx\.com|x handle/i },
  { key: "portfolio", re: /portfolio|website|personal (site|url)|\burl\b/i },
  { key: "currentCompany", re: /current[\s_-]*(company|employer)|org(anization)?\b/i },
  { key: "currentTitle", re: /current[\s_-]*(title|role|position)|job title/i },
  { key: "noticePeriod", re: /notice[\s_-]*period|availab(le|ility) to start|start date/i },
  { key: "salary", re: /salary|compensation|ctc|expected pay/i },
  // "Are you authorized to work ... without sponsorship?" is a positive question: must win over the sponsorship rule.
  { key: "workAuthorized", re: /(legally )?authori[sz]ed to work|work authori[sz]ation|right to work|eligible to work/i },
  { key: "sponsorship", re: /sponsor|visa/i },
  { key: "gender", re: /gender/i },
  { key: "ethnicity", re: /race|ethnic|hispanic/i },
  { key: "veteran", re: /veteran/i },
  { key: "disability", re: /disabilit/i },
  { key: "location", re: /location|city|where are you (based|located)|address/i },
  { key: "fullName", re: /full[\s_-]*name|^name\b|your name|legal name/i },
];

const WEIGHTS = { name: 3, id: 3, label: 4, placeholder: 2 } as const;

export function classifyField(f: FieldDescriptor): Classification {
  const hay = { name: f.name, id: f.id, label: f.label, placeholder: f.placeholder };
  let best: { key: ProfileKey; score: number } | null = null;
  for (const rule of RULES) {
    if (rule.kinds && !rule.kinds.includes(f.kind)) continue;
    let score = 0;
    for (const [src, w] of Object.entries(WEIGHTS)) if (rule.re.test(hay[src as keyof typeof hay])) score += w;
    if (f.kind === "email" && rule.key === "email") score += 5;
    if (f.kind === "tel" && rule.key === "phone") score += 5;
    if (score > 0 && (!best || score > best.score)) best = { key: rule.key, score };
    if (score >= 4 && best?.key === rule.key) break; // first strong hit in priority order wins
  }
  // Open-ended text areas are always subjective, even if a keyword (e.g. "location") appears in the question.
  if (f.kind === "textarea" && (!best || best.score < 7)) {
    return { type: "subjective", question: f.label || f.placeholder || f.name };
  }
  if (best && best.score >= 2) return { type: "standard", key: best.key, confidence: Math.min(1, best.score / 7) };
  return { type: "subjective", question: f.label || f.placeholder || f.name };
}
