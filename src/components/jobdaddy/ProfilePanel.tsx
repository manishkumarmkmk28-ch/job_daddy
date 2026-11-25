import { useMemo, useState } from "react";
import { Download, FileJson } from "lucide-react";
import { profileFromResumeText, type FromResumeOptions } from "@/lib/career/from-resume";
import { matchKeywords } from "@/lib/career/keywords";
import { CHALLENGES, DEGREE_LEVELS } from "@/lib/career/preferences";

const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

/**
 * Turns the uploaded resume into the Auto-Applier's candidate_profile.json, lets the user complete the details the resume
 * cannot give (CTC, notice period, challenge...), and compares the resume with a job description.
 * Everything runs in the browser; nothing is uploaded.
 */
export function ProfilePanel({ text }: { text: string }) {
  // First pass with no user input: gives us the values detected from the resume to pre-fill the form.
  const detected = useMemo(() => profileFromResumeText(text).profile?.preferences, [text]);

  const [needsSponsorship, setNeedsSponsorship] = useState(false);
  const [notice, setNotice] = useState("");
  const [currentCtc, setCurrentCtc] = useState("");
  const [expectedCtc, setExpectedCtc] = useState("");
  const [roles, setRoles] = useState(() => (detected?.targetRoles ?? []).join(", "));
  const [degree, setDegree] = useState(detected?.highestDegree ?? "");
  const [stack, setStack] = useState(() => (detected?.techStack ?? []).slice(0, 15).join(", "));
  const [challenge, setChallenge] = useState("");
  const [jd, setJd] = useState("");

  const draft = useMemo(() => {
    const n = Number(notice);
    const o: FromResumeOptions = {
      requiresSponsorship: needsSponsorship,
      targetRoles: split(roles),
      techStack: split(stack),
      ...(degree ? { highestDegree: degree } : {}),
      ...(challenge ? { challenge } : {}),
      ...(currentCtc.trim() ? { currentCtc: currentCtc.trim() } : {}),
      ...(expectedCtc.trim() ? { salaryExpectation: expectedCtc.trim() } : {}),
      ...(notice.trim() && Number.isFinite(n) && n >= 0 ? { noticePeriodDays: Math.round(n) } : {}),
    };
    return profileFromResumeText(text, o);
  }, [text, needsSponsorship, notice, currentCtc, expectedCtc, roles, degree, stack, challenge]);

  const kw = useMemo(() => (jd.trim().length > 20 ? matchKeywords(text, jd) : null), [text, jd]);
  const p = draft.profile;
  const missing = draft.missing.filter((m) => !m.startsWith("workAuth"));
  const suggested = detected?.targetRoles ?? [];
  const addRole = (r: string) => { const cur = split(roles); if (!cur.includes(r)) setRoles([...cur, r].join(", ")); };

  const download = () => {
    if (!p) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(p, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "candidate_profile.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const label = "block text-xs text-muted-foreground mb-1";
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="flex items-center gap-2 text-lg font-bold"><FileJson className="h-5 w-5 text-primary" /> Application profile (for the Auto-Applier)</h3>
      <p className="mt-1 text-xs text-muted-foreground">Read from your resume in this browser. Nothing is uploaded. Check it and fill the blanks before you use it.</p>

      {p ? (
        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">Name</dt><dd>{p.contact.fullName}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Email</dt><dd>{p.contact.email}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Phone</dt><dd>{p.contact.phone}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Skills found</dt><dd>{p.skills.hard.length}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Jobs found</dt><dd>{p.experience.length}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Education found</dt><dd>{p.education.length}</dd></div>
        </dl>
      ) : (
        <p className="mt-4 text-sm text-warning">We could not read enough from this resume to build a profile. Missing: {missing.join(", ") || "contact details"}.</p>
      )}
      {p && missing.length > 0 && <p className="mt-3 text-sm text-warning">Not found: {missing.join(", ")}. Add these by hand in the downloaded file.</p>}
      {draft.warnings.map((w) => <p key={w} className="mt-2 text-xs text-muted-foreground">⚠ {w}</p>)}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label} htmlFor="pp-roles">Targeted roles (comma separated)</label>
          <input id="pp-roles" className={field} value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="e.g. Backend Developer, Data Analyst" />
          {suggested.length > 0 && (
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">Suggested from your skills:
              {suggested.map((r) => <button key={r} type="button" onClick={() => addRole(r)} className="rounded-full border border-primary/40 px-2.5 py-0.5 text-primary hover:bg-primary/10">+ {r}</button>)}
            </p>
          )}
        </div>
        <div>
          <label className={label} htmlFor="pp-degree">Highest degree</label>
          <select id="pp-degree" className={field} value={degree} onChange={(e) => setDegree(e.target.value)}>
            <option value="">Select</option>
            {DEGREE_LEVELS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="pp-notice">Notice period (days)</label>
          <input id="pp-notice" className={field} value={notice} onChange={(e) => setNotice(e.target.value)} inputMode="numeric" placeholder="e.g. 30" />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="pp-stack">Technical stack / job profile (comma separated)</label>
          <input id="pp-stack" className={field} value={stack} onChange={(e) => setStack(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="pp-cctc">Current CTC</label>
          <input id="pp-cctc" className={field} value={currentCtc} onChange={(e) => setCurrentCtc(e.target.value)} placeholder="e.g. 12 LPA" />
        </div>
        <div>
          <label className={label} htmlFor="pp-ectc">Expected CTC</label>
          <input id="pp-ectc" className={field} value={expectedCtc} onChange={(e) => setExpectedCtc(e.target.value)} placeholder="e.g. 18 LPA" />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="pp-challenge">Challenge you are facing</label>
          <select id="pp-challenge" className={field} value={challenge} onChange={(e) => setChallenge(e.target.value)}>
            <option value="">Select</option>
            {CHALLENGES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={needsSponsorship} onChange={(e) => setNeedsSponsorship(e.target.checked)} /> I need visa sponsorship</label>
        <button onClick={download} disabled={!p} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-40">
          <Download className="h-4 w-4" /> Download candidate_profile.json
        </button>
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <h4 className="font-semibold">Keyword match against a job</h4>
        <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={4} placeholder="Paste a job description to see which of its keywords your resume has"
          className="mt-2 w-full rounded-md border border-border bg-background p-2 text-sm" />
        {kw && (
          <div className="mt-3 space-y-2 text-sm">
            <p><span className="font-bold">{kw.scorePercent}%</span> of the job's keywords appear in your resume.</p>
            <ul className="flex flex-wrap gap-2">{kw.matched.map((k) => <li key={k} className="rounded-full border border-success/50 bg-success/15 px-2.5 py-1 text-success">{k}</li>)}</ul>
            {kw.missing.length > 0 && <>
              <p className="text-muted-foreground">Missing:</p>
              <ul className="flex flex-wrap gap-2">{kw.missing.map((k) => <li key={k} className="rounded-full border border-destructive/50 bg-destructive/15 px-2.5 py-1 text-destructive">{k}</li>)}</ul>
            </>}
          </div>
        )}
      </div>
    </div>
  );
}
