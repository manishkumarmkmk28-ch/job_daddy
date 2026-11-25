import type { Page } from "playwright";
import type { FieldDescriptor } from "./types.js";

/** Runs inside the page: collects every visible form control as a FieldDescriptor. */
export async function extractFields(page: Page): Promise<FieldDescriptor[]> {
  // tsx/esbuild injects a __name() helper into compiled functions; it must exist in the page context.
  await page.evaluate("window.__name = window.__name || ((f) => f)");
  return page.evaluate(() => {
    const txt = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
    const labelFor = (el: Element): string => {
      const id = el.getAttribute("id");
      if (id) {
        const l = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (l) return txt(l.textContent);
      }
      const wrap = el.closest("label");
      if (wrap) return txt(wrap.textContent);
      const aria = el.getAttribute("aria-label");
      if (aria) return txt(aria);
      // sibling / parent-group label (Lever / Ashby style: <div class=field><label>..</label><input></div>)
      const group = el.closest("div, li, fieldset, p");
      const l2 = group?.querySelector("label, legend, .application-label");
      return txt(l2?.textContent);
    };
    const visible = (el: Element) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      const s = getComputedStyle(el as HTMLElement);
      return s.display !== "none" && s.visibility !== "hidden" && (r.width > 0 || r.height > 0 || (el as HTMLInputElement).type === "file");
    };
    const out: any[] = [];
    const seenRadio = new Set<string>();
    let n = 0;
    document.querySelectorAll("input, select, textarea").forEach((el) => {
      const i = el as HTMLInputElement;
      const type = (i.type || "text").toLowerCase();
      if (["hidden", "submit", "button", "image", "reset"].includes(type)) return;
      if (!visible(el)) return;
      const tag = el.tagName.toLowerCase();
      const marker = `data-aa-${n++}`;
      el.setAttribute("data-aa", marker);
      const selector = `[data-aa="${marker}"]`;
      let kind: string = tag === "select" ? "select" : tag === "textarea" ? "textarea" : type;
      if (!["text","email","tel","url","textarea","select","radio","checkbox","file"].includes(kind)) kind = "text";
      let options: { value: string; label: string }[] = [];
      let label = labelFor(el);
      if (tag === "select") {
        options = Array.from((el as HTMLSelectElement).options).map((o) => ({ value: o.value, label: txt(o.textContent) }));
      } else if (kind === "radio") {
        const group = i.name;
        if (seenRadio.has(group)) return;
        seenRadio.add(group);
        const radios = Array.from(document.querySelectorAll(`input[type=radio][name="${CSS.escape(group)}"]`)) as HTMLInputElement[];
        options = radios.map((r) => ({ value: r.value, label: labelFor(r) || r.value }));
        const fs = i.closest("fieldset");
        label = txt(fs?.querySelector("legend")?.textContent) || txt(i.closest("div")?.parentElement?.querySelector(".application-label")?.textContent) || label;
      }
      out.push({
        selector, kind, name: i.name || "", id: i.id || "", placeholder: i.placeholder || "",
        label, required: i.required || el.getAttribute("aria-required") === "true" || /\*/.test(label),
        options, maxLength: i.maxLength > 0 ? i.maxLength : undefined,
      });
    });
    return out;
  });
}
