import { test } from "node:test";
import assert from "node:assert/strict";
import { JobDescriptionSchema } from "../src/parser/jdExtract.js";

test("JobDescriptionSchema validates extracted JD data correctly", () => {
  const sampleJD = {
    jobTitle: "Software Engineer",
    companyName: "Acme Corp",
    requiredSkills: ["TypeScript", "Node.js", "React"],
    experienceYears: { min: 2, max: 4 },
    keyResponsibilities: ["Develop scalable microservices", "Collaborate with frontend teams"],
    qualifications: ["B.Tech or equivalent degree"]
  };

  const parsed = JobDescriptionSchema.parse(sampleJD);
  assert.equal(parsed.jobTitle, "Software Engineer");
  assert.equal(parsed.companyName, "Acme Corp");
  assert.equal(parsed.requiredSkills.includes("TypeScript"), true);
  assert.equal(parsed.experienceYears.min, 2);
});
