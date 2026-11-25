import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { dryRun } from "../src/runner/dryrun.js";
import { MockLLM } from "../src/llm/clients.js";

const profile = { ...JSON.parse(readFileSync("data/candidate_profile.sample.json", "utf8")), resumePath: resolve("data/resume.pdf") };
const url = (n: string) => pathToFileURL(resolve(`tests/fixtures/${n}.html`)).href;
const by = (rep: Awaited<ReturnType<typeof dryRun>>, label: RegExp) => rep.results.find((r) => label.test(r.field.label))!;

test("greenhouse fixture: fills standard fields, never submits, stays under token budget", async () => {
  const rep = await dryRun(url("greenhouse"), profile, new MockLLM());
  assert.equal(rep.submitted, false);
  assert.equal(by(rep, /First Name/).value, "Asha");
  assert.equal(by(rep, /visa sponsorship/).value, "No");
  assert.equal(by(rep, /Gender/).value, "Decline to self-identify");
  assert.equal(by(rep, /Why do you want/).tier, "amber");
  assert.ok(rep.tokens.total < 1500);
  assert.ok(rep.results.every((r) => r.status === "filled"), JSON.stringify(rep.results.filter((r) => r.status !== "filled").map((r) => [r.field.label, r.status, r.detail])));
});

test("lever fixture: single name field, URL fields, radio authorization is Yes", async () => {
  const rep = await dryRun(url("lever"), profile, new MockLLM());
  assert.equal(by(rep, /Full name/).value, "Asha Verma");
  assert.equal(by(rep, /GitHub/).value, "https://github.com/ashaverma");
  assert.equal(by(rep, /legally authorized/).value, "Yes");
  assert.equal(by(rep, /notice period/).value, "30 days");
});
