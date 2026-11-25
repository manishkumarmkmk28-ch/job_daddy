import { z } from "zod";

const iso = z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, "ISO-8601 date (YYYY, YYYY-MM or YYYY-MM-DD)");

export const ContactSchema = z.object({
  fullName: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().regex(/^\+\d{6,15}$/, "E.164 with country code, e.g. +919876543210"),
  location: z.string().optional(),
  portfolioUrl: z.string().url().optional(),
  githubUrl: z.string().url().optional(),
  linkedinUrl: z.string().url().optional(),
  twitterUrl: z.string().url().optional(),
});

export const ExperienceSchema = z.object({
  employer: z.string(),
  title: z.string(),
  location: z.string().optional(),
  startDate: iso,
  endDate: iso.nullable(), // null = current
  responsibilities: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
});

export const EducationSchema = z.object({
  degree: z.string(),
  field: z.string(),
  institution: z.string(),
  graduationDate: iso,
  gpa: z.string().optional(),
});

export const SkillsSchema = z.object({
  hard: z.array(z.string()).default([]),
  soft: z.array(z.string()).default([]),
  frameworks: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
});

export const WorkAuthSchema = z.object({
  requiresSponsorship: z.boolean(),
  authorizedCountries: z.array(z.string()).default([]),
  noticePeriodDays: z.number().int().nonnegative().optional(),
  salaryExpectation: z.string().optional(),
  // Demographic / EEO answers are optional and default to "decline to answer".
  gender: z.string().default("Decline to self-identify"),
  ethnicity: z.string().default("Decline to self-identify"),
  veteranStatus: z.string().default("Decline to self-identify"),
  disabilityStatus: z.string().default("Decline to self-identify"),
});

export const CandidateProfileSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  contact: ContactSchema,
  experience: z.array(ExperienceSchema).default([]),
  education: z.array(EducationSchema).default([]),
  skills: SkillsSchema.default({ hard: [], soft: [], frameworks: [], certifications: [] }),
  workAuth: WorkAuthSchema,
  /** Custom Q&A cache: normalised question -> previously approved answer. */
  qaCache: z.record(z.string(), z.string()).default({}),
  resumePath: z.string().optional(),
});

export type CandidateProfile = z.infer<typeof CandidateProfileSchema>;
