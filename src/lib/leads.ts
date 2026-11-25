// Set VITE_LEAD_WEBHOOK_URL in a .env file (see .env.example) to your Make.com or
// Google Apps Script webhook URL. Without it, leads are only logged to the console.
export const LEAD_WEBHOOK_URL: string = import.meta.env["VITE_LEAD_WEBHOOK_URL"] ?? "";
export const LEAD_KEY = "jobdaddy_lead_v1";

export type Lead = {
  name: string;
  phone: string;
  email: string;
  targetRole: string;
  preferredRole: string;
  timestamp: string;
  score?: number;
  aiPercent?: number;
  wordCount?: number;
  metrics?: number;
  flags?: string[];
  skills?: string[];
};

export async function sendLead(lead: Lead) {
  if (!LEAD_WEBHOOK_URL) {
    console.info("[JobDaddy] No VITE_LEAD_WEBHOOK_URL set — lead captured locally only:", lead);
    return;
  }
  try {
    await fetch(LEAD_WEBHOOK_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        ...lead,
        targetRole: lead.targetRole ?? "",
        preferredRole: lead.preferredRole ?? "",
      }),
    });
  } catch (e) {
    console.warn("Lead webhook failed", e);
  }
}

export function loadLead(): Lead | null {
  try {
    const v = JSON.parse(localStorage.getItem(LEAD_KEY) || "null") as Partial<Lead> | null;
    // Guard against stale/corrupt storage, which would otherwise crash the header (lead.name.split).
    if (v && typeof v.name === "string" && v.name.trim() && typeof v.email === "string") {
      return {
        name: v.name,
        phone: v.phone ?? "",
        email: v.email,
        targetRole: v.targetRole ?? "",
        preferredRole: v.preferredRole ?? "",
        timestamp: v.timestamp ?? new Date().toISOString(),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveLead(l: Lead) {
  try {
    localStorage.setItem(LEAD_KEY, JSON.stringify(l));
  } catch {
    /* storage blocked (private mode) — continue without persisting */
  }
}

export function clearLead() {
  try {
    localStorage.removeItem(LEAD_KEY);
  } catch {
    /* ignore */
  }
}