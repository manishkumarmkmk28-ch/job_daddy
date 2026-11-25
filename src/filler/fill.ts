import type { Page } from "playwright";
import type { CandidateProfile } from "../schema/profile.js";
import type { Classification, FieldDescriptor } from "../parser/types.js";
import { profileValue, matchOption } from "./values.js";

export interface FillResult {
  field: FieldDescriptor;
  classification: Classification;
  status: "filled" | "needs-ai" | "no-data" | "unmatched-option" | "error";
  value?: string;
  /** green = confident standard mapping, amber = AI-generated or low-confidence (shown in review UI, Phase 3). */
  tier: "green" | "amber" | "none";
  detail?: string;
}

const LOW_CONFIDENCE = 0.55;

/** Fill one field with a concrete value. Never clicks submit. */
export async function fillControl(page: Page, f: FieldDescriptor, value: string, resumePath?: string): Promise<void> {
  const loc = page.locator(f.selector);
  switch (f.kind) {
    case "file":
      if (!resumePath) throw new Error("no resume path in profile");
      await loc.setInputFiles(resumePath);
      return;
    case "select": {
      const opt = matchOption(f.options, value);
      if (!opt) throw new Error(`no option matches "${value}"`);
      await loc.selectOption(opt.value);
      return;
    }
    case "radio": {
      const opt = matchOption(f.options, value);
      if (!opt) throw new Error(`no radio matches "${value}"`);
      await page.locator(`input[type=radio][name="${f.name}"][value="${opt.value}"]`).check();
      return;
    }
    case "checkbox":
      await loc.check();
      return;
    default: {
      const v = f.maxLength ? value.slice(0, f.maxLength) : value;
      await loc.fill(v);
    }
  }
}

/** Fill every standard field; return subjective ones untouched for the AI layer. */
export async function fillStandardFields(
  page: Page, profile: CandidateProfile, fields: FieldDescriptor[],
  classify: (f: FieldDescriptor) => Classification,
): Promise<FillResult[]> {
  const results: FillResult[] = [];
  for (const field of fields) {
    const classification = classify(field);
    if (classification.type === "subjective") {
      results.push({ field, classification, status: "needs-ai", tier: "amber" });
      continue;
    }
    const value = profileValue(profile, classification.key);
    const tier = classification.confidence >= LOW_CONFIDENCE ? "green" : "amber";
    if (value === undefined || value === "") {
      results.push({ field, classification, status: "no-data", tier: "amber", detail: `profile has no ${classification.key}` });
      continue;
    }
    try {
      await fillControl(page, field, value, profile.resumePath);
      results.push({ field, classification, status: "filled", value, tier });
    } catch (e) {
      const msg = (e as Error).message;
      results.push({ field, classification, status: /no (option|radio)/.test(msg) ? "unmatched-option" : "error", value, tier: "amber", detail: msg });
    }
  }
  return results;
}
