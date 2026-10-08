import type { CredentialType } from "@prisma/client";
import { serializeCredential } from "./serialize.js";

// Fixed-template content builders over stored credentials. Every sentence is
// assembled from recorded fields (title, type, date, org, skills, evidence);
// absent fields drop their sentence instead of being invented.

export type StoredCredential = ReturnType<typeof serializeCredential>;

const TYPE_VERB: Record<CredentialType, string> = {
  PROJECT: "Built",
  CERTIFICATE: "Earned",
  SEMINAR: "Attended",
  TRAINING: "Completed training on",
  AWARD: "Received",
  COMPETITION: "Competed in",
  INTERNSHIP: "Completed an internship involving",
  ORGANIZATION: "Served with",
  VOLUNTEER: "Volunteered with",
  OTHER: "Completed",
};

const TYPE_NOUN: Record<CredentialType, string> = {
  PROJECT: "project",
  CERTIFICATE: "certification",
  SEMINAR: "seminar",
  TRAINING: "training",
  AWARD: "award",
  COMPETITION: "competition",
  INTERNSHIP: "internship",
  ORGANIZATION: "organization",
  VOLUNTEER: "volunteer role",
  OTHER: "experience",
};

export function credentialYear(c: StoredCredential): number | null {
  return c.date ? new Date(c.date).getUTCFullYear() : null;
}

export function truncate(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

function contextSuffix(c: StoredCredential): string {
  const year = credentialYear(c);
  const parts: string[] = [];
  if (year) parts.push(String(year));
  if (c.organization) parts.push(`with ${c.organization.name}`);
  return parts.length > 0 ? ` (${parts.join(", ")})` : "";
}

// 1–4 resume bullets per credential: headline, description, skills, evidence.
export function buildResumeBullets(c: StoredCredential): string[] {
  const lines = [`${TYPE_VERB[c.type]} ${c.title}${contextSuffix(c)}.`];
  if (c.description) lines.push(truncate(c.description, 200));
  if (c.skills.length > 0) {
    lines.push(`Applied ${c.skills.slice(0, 3).map((s) => s.name).join(", ")} in practice.`);
  }
  if (c.evidenceCount > 0) {
    lines.push(`Supported by ${c.evidenceCount} evidence file${c.evidenceCount === 1 ? "" : "s"} on record.`);
  }
  return lines;
}

// 2–3 polished portfolio paragraphs per credential.
export function buildPortfolioDescription(c: StoredCredential, evidenceNames: string[]): string[] {
  const year = credentialYear(c);
  const paragraphs = [
    `${c.title} is a ${TYPE_NOUN[c.type]}${c.organization ? ` with ${c.organization.name}` : ""}${year ? ` completed in ${year}` : ""}.${c.description ? ` ${truncate(c.description, 2000)}` : ""}`,
  ];
  if (c.skills.length > 0) {
    paragraphs.push(`Skills and technologies involved include ${c.skills.map((s) => s.name).join(", ")}.`);
  }
  const closing: string[] = [];
  if (evidenceNames.length > 0) closing.push(`Documented with ${evidenceNames.join(", ")} on file.`);
  if (c.url) closing.push(`More information: ${c.url}.`);
  if (closing.length > 0) paragraphs.push(closing.join(" "));
  return paragraphs;
}

export interface InterviewQuestion {
  question: string;
  talkingPoints: string[];
}

function contextPoint(c: StoredCredential): string {
  const year = credentialYear(c);
  const bits = [c.type, year ? String(year) : null, c.organization?.name ?? null, c.location].filter(
    Boolean,
  );
  return `Context on record: ${bits.join(", ")}.`;
}

// Up to 4 questions per credential, each paired with talking points that cite
// the stored record (description excerpt, skills, evidence names, context).
export function buildInterviewQuestions(c: StoredCredential, evidenceNames: string[]): InterviewQuestion[] {
  const questions: InterviewQuestion[] = [];
  const skillPoints =
    c.skills.length > 0 ? [`Skills on record: ${c.skills.map((s) => s.name).join(", ")}.`] : [];
  const evidencePoint =
    evidenceNames.length > 0
      ? `Evidence on file: ${evidenceNames.join(", ")}.`
      : "No evidence files attached yet.";

  questions.push({
    question: `Walk me through ${c.title}.`,
    talkingPoints: [
      ...(c.description ? [truncate(c.description, 200)] : []),
      ...skillPoints,
      contextPoint(c),
    ],
  });

  if (c.skills.length > 0) {
    questions.push({
      question: `What was the hardest part of using ${c.skills[0].name} in ${c.title}?`,
      talkingPoints: [...skillPoints, evidencePoint],
    });
  }

  if (c.organization) {
    questions.push({
      question: `How did ${c.organization.name} shape the outcome of ${c.title}?`,
      talkingPoints: [contextPoint(c), ...(c.description ? [truncate(c.description, 200)] : [])],
    });
  }

  questions.push({
    question: `What would you do differently in ${c.title} today?`,
    talkingPoints: [evidencePoint, contextPoint(c)],
  });

  return questions;
}
