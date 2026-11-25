/** Pure helpers for the extra profile fields: highest degree, suggested roles, challenge categories. */

export const DEGREE_LEVELS = ["Diploma", "Bachelor's", "Master's", "PhD", "Other"] as const;

/** Challenge categories exactly as given by the client (JobDaddy). Labels to be confirmed with the client. */
export const CHALLENGES = ["NRIC", "RICNS", "IP / Confused - where to go?", "Foundational (freshers)"] as const;

/** Map a degree string found on a resume to a level. Highest of several wins. */
export function degreeLevel(text: string): (typeof DEGREE_LEVELS)[number] | undefined {
  const t = text.toLowerCase().replace(/[.\s]/g, "");
  if (/ph\.?d|doctorate/.test(text.toLowerCase())) return "PhD";
  if (/mtech|msc|mca|mba|mcom|me\b|master|postgraduate|pgdm/.test(t) || /\bm\.?e\.?\b/i.test(text)) return "Master's";
  if (/btech|bsc|bca|bcom|be\b|bachelor|undergraduate|bba|ba\b/.test(t) || /\bb\.?e\.?\b/i.test(text)) return "Bachelor's";
  if (/diploma|polytechnic/.test(t)) return "Diploma";
  return undefined;
}

const RANK: Record<string, number> = { Diploma: 1, "Bachelor's": 2, "Master's": 3, PhD: 4 };
export function highestDegree(degrees: string[]): (typeof DEGREE_LEVELS)[number] | undefined {
  let best: (typeof DEGREE_LEVELS)[number] | undefined;
  for (const d of degrees) {
    const l = degreeLevel(d);
    if (l && (!best || (RANK[l] ?? 0) > (RANK[best] ?? 0))) best = l;
  }
  return best;
}

const ROLES: [string, string[]][] = [
  ["Frontend Developer", ["react", "angular", "vue", "html", "css", "javascript", "typescript", "tailwind", "redux", "next.js"]],
  ["Backend Developer", ["node.js", "express", "django", "flask", "fastapi", "spring", "spring boot", "java", "sql", "postgresql", "mysql", "mongodb", "rest", "api", "redis", "microservices", ".net", "php"]],
  ["Full Stack Developer", ["react", "node.js", "javascript", "typescript", "sql", "mongodb", "express", "html", "css", "next.js"]],
  ["Data Analyst", ["sql", "excel", "tableau", "power bi", "pandas", "numpy", "analytics", "python", "statistics"]],
  ["Data Scientist / ML Engineer", ["machine learning", "deep learning", "pytorch", "tensorflow", "scikit-learn", "nlp", "llm", "pandas", "python"]],
  ["DevOps Engineer", ["docker", "kubernetes", "terraform", "ansible", "jenkins", "ci/cd", "aws", "azure", "gcp", "linux", "bash"]],
  ["QA / Test Engineer", ["selenium", "jest", "pytest", "cypress", "playwright", "testing", "unit testing", "tdd", "postman"]],
  ["Mobile Developer", ["kotlin", "swift", "flutter", "react native", "android", "ios"]],
  ["Digital Marketing", ["seo", "marketing", "google ads", "analytics", "content", "social media"]],
  ["Sales / Business Development", ["sales", "crm", "salesforce", "hubspot", "negotiation", "lead generation"]],
];

/**
 * Suggest up to 3 target roles from the candidate's skills by keyword overlap.
 * This is a rule-based suggestion (no AI model is called); the user always edits the final list.
 */
export function suggestRoles(skills: string[], max = 3): string[] {
  const have = new Set(skills.map((s) => s.toLowerCase().trim()));
  return ROLES.map(([role, kws]) => ({ role, n: kws.filter((k) => have.has(k)).length }))
    .filter((r) => r.n >= 2)
    .sort((a, b) => b.n - a.n)
    .slice(0, max)
    .map((r) => r.role);
}
