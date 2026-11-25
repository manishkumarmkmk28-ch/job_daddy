/** Keyword extraction from a job description and matching against a resume (client request: "are relevant keywords fetched?"). */
const KNOWN = ["javascript","typescript","python","java","c++","c#","go","golang","rust","kotlin","swift","php","ruby","scala","sql","nosql","mysql","postgresql","postgres","mongodb","redis","elasticsearch","kafka","rabbitmq",
  "react","angular","vue","next.js","node.js","express","django","flask","fastapi","spring","spring boot",".net","graphql","rest","grpc","microservices","html","css","tailwind","redux",
  "aws","azure","gcp","docker","kubernetes","terraform","ansible","jenkins","ci/cd","git","github actions","linux","bash","devops",
  "machine learning","deep learning","nlp","llm","pytorch","tensorflow","scikit-learn","pandas","numpy","spark","hadoop","airflow","etl","data warehouse","tableau","power bi","excel",
  "agile","scrum","jira","figma","ux","ui","testing","jest","pytest","selenium","playwright","cypress","unit testing","tdd","api","oauth","security","system design",
  "seo","sales","marketing","crm","salesforce","hubspot","analytics","product management","stakeholder management","communication","leadership","project management"];
const STOP = new Set("a an and are as at be by for from has have in is it its of on or our that the their this to we will with you your who what when where which not but can able also including etc must should strong good great excellent experience experienced work working team teams years year role job company ability skills skill knowledge understanding looking join about into over such other new more most than within across using use used build building develop developing development responsibilities requirements required preferred plus nice have having candidate position opportunity environment".split(" "));

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (text: string, kw: string) => new RegExp(`(^|[^a-z0-9+#.])${esc(kw)}($|[^a-z0-9+#])`, "i").test(text);

export interface KeywordReport { jdKeywords: string[]; matched: string[]; missing: string[]; scorePercent: number }

export function extractKeywords(jd: string, max = 30): string[] {
  const lower = jd.toLowerCase();
  const known = KNOWN.filter((k) => has(lower, k));
  const freq = new Map<string, number>();
  for (const w of lower.match(/[a-z][a-z0-9+#.-]{2,}/g) ?? []) if (!STOP.has(w) && !known.some((k) => k === w)) freq.set(w, (freq.get(w) ?? 0) + 1);
  const frequent = [...freq].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([w]) => w);
  return [...new Set([...known, ...frequent])].slice(0, max);
}

export function matchKeywords(resumeText: string, jd: string): KeywordReport {
  const jdKeywords = extractKeywords(jd);
  const matched = jdKeywords.filter((k) => has(resumeText, k));
  const missing = jdKeywords.filter((k) => !matched.includes(k));
  return { jdKeywords, matched, missing, scorePercent: jdKeywords.length ? Math.round((matched.length / jdKeywords.length) * 100) : 0 };
}
