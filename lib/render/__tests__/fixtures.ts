import type { Cv } from "../../schema";

/** Minimal valid Cv covering every renderable section, for reuse across render tests. */
export const sampleCv: Cv = {
  name: "Jane Doe",
  title: "Senior Software Engineer",
  contact: {
    email: "jane@example.com",
    phone: "+1 555 123 4567",
    location: "Remote",
    links: ["https://example.com/jane"],
  },
  summary: "Experienced engineer building reliable web platforms.",
  skills: ["TypeScript", "React", "Node.js"],
  experience: [
    {
      company: "Acme Corp",
      role: "Staff Engineer",
      dates: "2020 - Present",
      bullets: ["Led migration to TypeScript", "Mentored junior engineers"],
    },
  ],
  education: [
    {
      school: "State University",
      degree: "B.Sc. Computer Science",
      dates: "2012 - 2016",
    },
  ],
  certifications: ["AWS Certified Solutions Architect"],
};

/** Only the bare minimum populated (a name); every other field is empty. */
export const minimalCv: Cv = {
  name: "Jordan Lee",
  title: "",
  contact: { email: "", phone: "", location: "", links: [] },
  summary: "",
  skills: [],
  experience: [],
  education: [],
  certifications: [],
};

/** Otherwise-normal Cv with every optional section (skills, experience, certifications) empty. */
export const emptyOptionalSectionsCv: Cv = {
  ...sampleCv,
  skills: [],
  experience: [],
  certifications: [],
};

/**
 * Non-Latin and emoji content throughout: CJK, Arabic, Hebrew (no RTL layout
 * claim, but renderers must not crash or corrupt the text), and emoji.
 */
export const unicodeCv: Cv = {
  ...sampleCv,
  name: "田中太郎 🚀",
  title: "エンジニア",
  contact: {
    ...sampleCv.contact,
    location: "東京, 日本",
  },
  summary: "国際的なチームで働く。مرحبا بالعالم. שלום עולם. 😀",
  skills: ["TypeScript", "漢字スキル", "الأمان"],
  experience: [
    {
      company: "株式会社アクメ",
      role: "シニアエンジニア",
      dates: "2020 - 現在",
      bullets: ["主导迁移到 TypeScript 🎉", "قاد فريق من المهندسين"],
    },
  ],
};

/** Accented Latin script only — within the bundled PDF font's glyph coverage. */
export const accentedLatinCv: Cv = {
  ...sampleCv,
  name: "José García Muñoz",
  summary: "Ingénieur expérimenté basé à Zürich, café-driven, née à Malmö.",
  experience: [
    {
      company: "Société Générale",
      role: "Développeur Senior",
      dates: "2020 - Présent",
      bullets: ["Dirigé la migration vers TypeScript"],
    },
  ],
};

/** A single very long bullet, plus a multi-paragraph summary. */
export const longContentCv: Cv = {
  ...sampleCv,
  summary: "Paragraph one.\n\nParagraph two.\n\nParagraph three.",
  experience: [
    {
      ...sampleCv.experience[0],
      bullets: ["Shipped a feature. ".repeat(200).trim()],
    },
  ],
};

/** Markdown-significant characters (*, _, #, `, |) in ordinary CV content. */
export const markdownSpecialCharsCv: Cv = {
  ...sampleCv,
  skills: ["C++", "*bold*", "a|b"],
  experience: [
    {
      company: "A_B & # Corp",
      role: "Eng`ineer",
      dates: "2020",
      bullets: ["# not a heading", "Use `code` and | pipes and *stars*"],
    },
  ],
};

/** HTML-significant characters (<, >, &, quotes) in ordinary (non-link) fields. */
export const htmlSpecialCharsCv: Cv = {
  ...sampleCv,
  name: `A & B <Corp> "Elite"`,
  experience: [
    {
      company: `R&D <Team> 'special'`,
      role: "Eng<ineer>",
      dates: "2020",
      bullets: ['Built <widget> & "tools"'],
    },
  ],
};
