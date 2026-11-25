import type { CandidateProfile } from "../schema/profile.js";
import type { ProfileKey } from "../parser/types.js";

/** Resolve a profile key to the string we should type / select. undefined = nothing known. */
export function profileValue(p: CandidateProfile, key: ProfileKey): string | undefined {
  const cur = p.experience.find((e) => e.endDate === null) ?? p.experience[0];
  switch (key) {
    case "firstName": return p.contact.firstName;
    case "lastName": return p.contact.lastName;
    case "fullName": return p.contact.fullName;
    case "email": return p.contact.email;
    case "phone": return p.contact.phone;
    case "location": return p.contact.location;
    case "linkedin": return p.contact.linkedinUrl;
    case "github": return p.contact.githubUrl;
    case "portfolio": return p.contact.portfolioUrl;
    case "twitter": return p.contact.twitterUrl;
    case "currentCompany": return cur?.employer;
    case "currentTitle": return cur?.title;
    case "noticePeriod": return p.workAuth.noticePeriodDays !== undefined ? `${p.workAuth.noticePeriodDays} days` : undefined;
    case "salary": return p.workAuth.salaryExpectation;
    case "sponsorship": return p.workAuth.requiresSponsorship ? "Yes" : "No";
    case "workAuthorized": return p.workAuth.requiresSponsorship ? "No" : "Yes";
    case "gender": return p.workAuth.gender;
    case "ethnicity": return p.workAuth.ethnicity;
    case "veteran": return p.workAuth.veteranStatus;
    case "disability": return p.workAuth.disabilityStatus;
    case "resume": return p.resumePath;
  }
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Pick the best option for a wanted value; "Decline…" answers match any "decline / prefer not" option. */
export function matchOption(options: { value: string; label: string }[], wanted: string): { value: string; label: string } | undefined {
  const w = norm(wanted);
  const real = options.filter((o) => o.value !== "" && !/^select|^choose|^please/i.test(o.label));
  const declining = /decline|prefer not|do not wish|don t wish/.test(w);
  if (declining) return real.find((o) => /decline|prefer not|do not wish|don.?t wish/i.test(o.label));
  return (
    real.find((o) => norm(o.label) === w || norm(o.value) === w) ??
    real.find((o) => norm(o.label).startsWith(w) || w.startsWith(norm(o.label))) ??
    real.find((o) => norm(o.label).includes(w))
  );
}
