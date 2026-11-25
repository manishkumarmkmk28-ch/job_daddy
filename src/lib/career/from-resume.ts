import { CandidateProfileSchema, type CandidateProfile } from "./profile-schema";
import { highestDegree, suggestRoles } from "./preferences";

/**
 * Resume text -> candidate_profile.json draft. Pure function (no Node APIs) so it can also be copied into the
 * JobDaddy front end. Heuristic: contact details and skills are reliable, work history is best-effort.
 * Never invents data: anything it cannot find is listed in `missing`, anything uncertain in `warnings`.
 */
export interface ProfileDraft { profile: CandidateProfile | null; missing: string[]; warnings: string[] }
export interface FromResumeOptions {
  defaultCountryCode?: string; requiresSponsorship?: boolean; noticePeriodDays?: number;
  /** Expected CTC. */ salaryExpectation?: string; currentCtc?: string;
  /** Overrides for what is otherwise derived from the resume. */
  targetRoles?: string[]; highestDegree?: string; techStack?: string[]; challenge?: string;
}

const MONTHS: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", sept: "09", oct: "10", nov: "11", dec: "12" };
const SECTION = /^(summary|profile|objective|experience|work experience|professional experience|employment( history)?|education|academics?|skills|technical skills|key skills|projects|certifications?|achievements|awards)\s*:?$/i;
const DEGREE = /\b(b\.?\s?tech|b\.?\s?e\.?|b\.?\s?sc|b\.?\s?c\.?a|b\.?\s?com|m\.?\s?tech|m\.?\s?sc|m\.?\s?c\.?a|mba|bachelor[’' ]?s?|master[’' ]?s?|ph\.?d|diploma)\b/i;
const DATE_TOKEN = "(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?\\s+)?(?:19|20)\\d{2}";
const RANGE = new RegExp(`(${DATE_TOKEN})\\s*(?:-|–|—|to)\\s*(${DATE_TOKEN}|present|current|now|till date)`, "i");

function isoDate(tok: string): string {
  const y = tok.match(/(?:19|20)\d{2}/)![0];
  const m = tok.match(/[a-z]{3,}/i)?.[0].slice(0, 4).toLowerCase();
  const mm = m ? (MONTHS[m] ?? MONTHS[m.slice(0, 3)]) : undefined;
  return mm ? `${y}-${mm}` : y;
}

function normalizePhone(raw: string, cc: string): string | undefined {
  const digits = raw.replace(/[^\d]/g, "");
  if (raw.trim().startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : undefined;
  if (digits.length === 10) return `${cc}${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return undefined;
}

export function profileFromResumeText(text: string, o: FromResumeOptions = {}): ProfileDraft {
  const cc = o.defaultCountryCode ?? "+91";
  const missing: string[] = [], warnings: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (lines.length < 3) warnings.push("Text has almost no line breaks (common with PDFs); only contact details and skills can be read reliably.");

  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phoneRaw = text.match(/(?:\+\d{1,3}[\s-]?)?(?:\(?\d{3,5}\)?[\s-]?){2,4}\d{2,4}/g)?.map((p) => normalizePhone(p, cc)).find(Boolean);
  const url = (re: RegExp) => { const m = text.match(re)?.[0]; return m ? (m.startsWith("http") ? m : `https://${m}`) : undefined; };
  const linkedinUrl = url(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w%-]+/i);
  const githubUrl = url(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i);

  const nameLine = lines.slice(0, 6).find((l) => !/[@\d/]|http|resume|curriculum/i.test(l) && /^[A-Z][A-Za-z.'-]*(?: [A-Z][A-Za-z.'-]*){1,3}$/.test(l) && !SECTION.test(l));
  const parts = nameLine?.split(" ") ?? [];

  // split into sections
  const sections: Record<string, string[]> = {};
  let cur = "header";
  for (const l of lines) {
    if (SECTION.test(l)) { cur = l.toLowerCase().replace(/:$/, ""); sections[cur] = []; continue; }
    (sections[cur] ??= []).push(l);
  }
  const sec = (re: RegExp) => Object.entries(sections).filter(([k]) => re.test(k)).flatMap(([, v]) => v);

  const skillLines = sec(/skills/);
  const skills = [...new Set(skillLines.flatMap((l) => l.replace(/^[^:]{1,30}:\s*/, "").split(/[,•|;·●▪]/)).map((s) => s.trim()).filter((s) => s.length > 1 && s.length <= 40))];

  const education = sec(/education|academic/).filter((l) => DEGREE.test(l)).slice(0, 3).map((l) => {
    const year = l.match(/(?:19|20)\d{2}(?!.*(?:19|20)\d{2})/)?.[0];
    const inst = l.match(/[A-Z][\w&.' -]*(?:University|College|Institute|School|IIT|NIT)[\w&.' -]*/)?.[0]?.trim() ?? "";
    const degree = l.match(DEGREE)![0];
    const field = l.match(/(?:in|of)\s+([A-Za-z &]+?)(?:,|\||-|\(|$)/i)?.[1]?.trim() ?? "";
    return { degree, field, institution: inst, graduationDate: year ?? "" };
  });

  const experience: CandidateProfile["experience"] = [];
  const expLines = sec(/experience|employment/);
  const isMoney = (t: string) => /\d+\s?%|₹|\$|\d+x/.test(t);
  for (let i = 0; i < expLines.length; i++) {
    const line = expLines[i] ?? "";
    const m = line.match(RANGE);
    if (!m || !m[1] || !m[2]) continue;
    const head = line.replace(RANGE, "").replace(/[()|]/g, " ").trim().split(/\s+[|–—-]\s+|,\s+|\s+at\s+/i).map((s) => s.trim()).filter(Boolean);
    const before = i > 0 ? (expLines[i - 1] ?? "") : "";
    const prev = head.length < 2 && before && !RANGE.test(before) ? before : "";
    const title = head.length >= 2 ? (head[0] ?? "") : (prev || head[0] || "");
    const employer = head.length >= 2 ? (head[1] ?? "") : (head[0] ?? "");
    const bullets: string[] = [];
    for (let j = i + 1; j < expLines.length; j++) {
      const l = expLines[j] ?? "";
      if (RANGE.test(l)) break;
      bullets.push(l.replace(/^[-•●▪*]\s*/, ""));
    }
    const endsNow = !/\d{4}/.test(m[2]);
    experience.push({ title, employer, startDate: isoDate(m[1]), endDate: endsNow ? null : isoDate(m[2]),
      responsibilities: bullets.filter((x) => !isMoney(x)), achievements: bullets.filter(isMoney) });
  }
  if (experience.length) warnings.push("Work history is read heuristically: check job title vs employer, dates and bullets.");

  if (!nameLine) missing.push("name");
  if (!email) missing.push("email");
  if (!phoneRaw) missing.push("phone");
  if (!skills.length) missing.push("skills");
  if (!education.length) missing.push("education");
  if (!experience.length) missing.push("experience");
  missing.push("workAuth.requiresSponsorship (assumed " + (o.requiresSponsorship ?? false) + " - confirm with the candidate)");

  const parsed = CandidateProfileSchema.safeParse({
    contact: { fullName: nameLine ?? "", firstName: parts[0] ?? "", lastName: parts.slice(1).join(" "), email: email ?? "", phone: phoneRaw ?? "", linkedinUrl, githubUrl },
    experience, education: education.filter((e) => e.institution || e.field || e.graduationDate),
    skills: { hard: skills, soft: [], frameworks: [], certifications: [] },
    workAuth: { requiresSponsorship: o.requiresSponsorship ?? false, authorizedCountries: [], noticePeriodDays: o.noticePeriodDays, salaryExpectation: o.salaryExpectation, currentCtc: o.currentCtc },
    preferences: {
      targetRoles: o.targetRoles ?? suggestRoles(skills),
      highestDegree: o.highestDegree ?? highestDegree(education.map((e) => e.degree)),
      techStack: o.techStack ?? skills,
      challenge: o.challenge,
    },
  });
  if (!parsed.success) { warnings.push("Profile is incomplete: " + parsed.error.issues.map((i) => i.path.join(".")).join(", ")); return { profile: null, missing, warnings }; }
  return { profile: parsed.data, missing, warnings };
}
