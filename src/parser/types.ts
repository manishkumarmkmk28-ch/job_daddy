export type FieldKind = "text" | "email" | "tel" | "url" | "textarea" | "select" | "radio" | "checkbox" | "file";

export interface FieldDescriptor {
  /** Stable CSS selector that resolves this control inside the page. */
  selector: string;
  kind: FieldKind;
  name: string;
  id: string;
  placeholder: string;
  label: string;
  required: boolean;
  options: { value: string; label: string }[]; // select options / radio group choices
  maxLength?: number;
}

export type ProfileKey =
  | "firstName" | "lastName" | "fullName" | "email" | "phone" | "location"
  | "linkedin" | "github" | "portfolio" | "twitter" | "resume"
  | "currentCompany" | "currentTitle" | "noticePeriod" | "salary" | "sponsorship" | "workAuthorized"
  | "gender" | "ethnicity" | "veteran" | "disability";

export type Classification =
  | { type: "standard"; key: ProfileKey; confidence: number }
  | { type: "subjective"; question: string }; // routed to the AI reasoning layer
