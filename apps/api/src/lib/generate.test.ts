import { describe, expect, it } from "vitest";
import type { StoredCredential } from "./generate.js";
import {
  buildInterviewQuestions,
  buildPortfolioDescription,
  buildResumeBullets,
  credentialYear,
  truncate,
} from "./generate.js";

function stored(overrides: Partial<StoredCredential> = {}): StoredCredential {
  return {
    id: "cred-1",
    title: "SOLARIS",
    description: "A web-based solar site pre-assessment system.",
    type: "PROJECT",
    date: new Date("2026-03-01T00:00:00Z"),
    location: "Manila",
    url: "https://example.com/solaris",
    organization: { id: "org-1", name: "ABC Tech", website: null },
    skills: [
      { id: "s1", name: "Node.js" },
      { id: "s2", name: "React" },
      { id: "s3", name: "PostgreSQL" },
      { id: "s4", name: "REST API" },
    ],
    tags: [],
    evidenceCount: 3,
    preview: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("credentialYear", () => {
  it("returns the UTC year, or null without a date", () => {
    expect(credentialYear(stored())).toBe(2026);
    expect(credentialYear(stored({ date: null }))).toBeNull();
  });
});

describe("truncate", () => {
  it("collapses whitespace and leaves short text alone", () => {
    expect(truncate("a  b\nc", 100)).toBe("a b c");
  });

  it("truncates with an ellipsis within the limit", () => {
    const out = truncate("x".repeat(50), 20);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(20);
  });
});

describe("buildResumeBullets", () => {
  it("assembles headline, description, skills (max 3), and evidence lines", () => {
    expect(buildResumeBullets(stored())).toEqual([
      "Built SOLARIS (2026, with ABC Tech).",
      "A web-based solar site pre-assessment system.",
      "Applied Node.js, React, PostgreSQL in practice.",
      "Supported by 3 evidence files on record.",
    ]);
  });

  it("uses the verb per credential type", () => {
    expect(buildResumeBullets(stored({ type: "CERTIFICATE" }))[0]).toMatch(/^Earned /);
    expect(buildResumeBullets(stored({ type: "VOLUNTEER", organization: null, date: null }))[0]).toBe(
      "Volunteered with SOLARIS.",
    );
  });

  it("drops sentences for missing fields instead of inventing them", () => {
    expect(
      buildResumeBullets(
        stored({ type: "OTHER", description: null, skills: [], evidenceCount: 0, organization: null, date: null }),
      ),
    ).toEqual(["Completed SOLARIS."]);
  });

  it("singularizes a single evidence file", () => {
    const lines = buildResumeBullets(stored({ evidenceCount: 1 }));
    expect(lines.at(-1)).toBe("Supported by 1 evidence file on record.");
  });
});

describe("buildPortfolioDescription", () => {
  it("builds headline, skills, and closing paragraphs", () => {
    expect(buildPortfolioDescription(stored(), ["cert.pdf", "photo.png"])).toEqual([
      "SOLARIS is a project with ABC Tech completed in 2026. A web-based solar site pre-assessment system.",
      "Skills and technologies involved include Node.js, React, PostgreSQL, REST API.",
      "Documented with cert.pdf, photo.png on file. More information: https://example.com/solaris.",
    ]);
  });

  it("returns a single paragraph when optional fields are absent", () => {
    const c = stored({
      description: null,
      skills: [],
      organization: null,
      date: null,
      url: null,
      type: "AWARD",
    });
    expect(buildPortfolioDescription(c, [])).toEqual(["SOLARIS is a award."]);
  });
});

describe("buildInterviewQuestions", () => {
  it("asks 4 questions for a fully-contextualized credential", () => {
    const qs = buildInterviewQuestions(stored(), ["cert.pdf"]);
    expect(qs).toHaveLength(4);
    expect(qs[0].question).toBe("Walk me through SOLARIS.");
    expect(qs[1].question).toContain("Node.js");
    expect(qs[2].question).toContain("ABC Tech");
    expect(qs[3].question).toContain("differently");
    expect(qs[0].talkingPoints.join(" ")).toContain("Context on record:");
  });

  it("asks only walkthrough + differently with no skills or org", () => {
    const qs = buildInterviewQuestions(stored({ skills: [], organization: null }), []);
    expect(qs).toHaveLength(2);
    expect(qs[0].talkingPoints).toContain("Context on record: PROJECT, 2026, Manila.");
    expect(qs[1].talkingPoints).toContain("No evidence files attached yet.");
  });
});
