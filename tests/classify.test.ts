import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyField } from "../src/parser/classify.js";
import { matchOption } from "../src/filler/values.js";
import type { FieldDescriptor } from "../src/parser/types.js";

const f = (o: Partial<FieldDescriptor>): FieldDescriptor => ({ selector: "x", kind: "text", name: "", id: "", placeholder: "", label: "", required: false, options: [], ...o });

test("standard fields map to profile keys", () => {
  const cases: [Partial<FieldDescriptor>, string][] = [
    [{ id: "first_name", label: "First Name *" }, "firstName"],
    [{ name: "job_application[last_name]", label: "Last Name" }, "lastName"],
    [{ kind: "email", label: "Email" }, "email"],
    [{ kind: "tel", label: "Mobile" }, "phone"],
    [{ kind: "file", label: "Resume/CV" }, "resume"],
    [{ name: "urls[GitHub]", label: "GitHub URL" }, "github"],
    [{ label: "Full name" , name: "name"}, "fullName"],
    [{ label: "What is your notice period?" }, "noticePeriod"],
  ];
  for (const [d, key] of cases) {
    const c = classifyField(f(d));
    assert.equal(c.type, "standard", JSON.stringify(d));
    if (c.type === "standard") assert.equal(c.key, key, JSON.stringify(d));
  }
});

test("authorized-to-work is not confused with sponsorship", () => {
  const a = classifyField(f({ kind: "radio", label: "Are you legally authorized to work in India without sponsorship?" }));
  const b = classifyField(f({ kind: "select", label: "Will you now or in the future require visa sponsorship?" }));
  assert.deepEqual([a.type === "standard" && a.key, b.type === "standard" && b.key], ["workAuthorized", "sponsorship"]);
});

test("open-ended textareas are subjective", () => {
  for (const label of ["Why do you want to work here?", "Describe a time you managed conflict.", "Tell us about a project you are proud of."]) {
    assert.equal(classifyField(f({ kind: "textarea", label })).type, "subjective");
  }
});

test("matchOption handles decline answers and placeholders", () => {
  const opts = [{ value: "", label: "Select" }, { value: "1", label: "Male" }, { value: "3", label: "Decline To Self Identify" }];
  assert.equal(matchOption(opts, "Decline to self-identify")?.value, "3");
  assert.equal(matchOption(opts, "male")?.value, "1");
  assert.equal(matchOption(opts, "nonexistent"), undefined);
});
