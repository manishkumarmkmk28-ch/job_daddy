import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CandidateProfileSchema } from "../src/schema/profile.js";

const sample = JSON.parse(readFileSync("data/candidate_profile.sample.json", "utf8"));

test("sample profile validates and applies defaults", () => {
  const p = CandidateProfileSchema.parse(sample);
  assert.equal(p.workAuth.gender, "Decline to self-identify");
});
test("rejects bad phone, bad date and missing email", () => {
  assert.throws(() => CandidateProfileSchema.parse({ ...sample, contact: { ...sample.contact, phone: "98765" } }));
  assert.throws(() => CandidateProfileSchema.parse({ ...sample, experience: [{ ...sample.experience[0], startDate: "June 2022" }] }));
  assert.throws(() => CandidateProfileSchema.parse({ ...sample, contact: { ...sample.contact, email: undefined } }));
});
