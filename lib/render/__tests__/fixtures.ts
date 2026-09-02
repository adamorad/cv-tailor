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
