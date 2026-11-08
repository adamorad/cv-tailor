import { z } from "zod";

export const cvSchema = z.object({
  name: z.string(),
  title: z.string(),
  contact: z.object({
    email: z.string(),
    phone: z.string(),
    location: z.string(),
    links: z.array(z.string()),
  }),
  summary: z.string(),
  skillGroups: z.array(
    z.object({
      label: z.string(),
      items: z.array(z.string()),
    }),
  ),
  experience: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
      location: z.string(),
      dates: z.string(),
      bullets: z.array(z.string()),
    }),
  ),
  education: z.array(
    z.object({
      school: z.string(),
      degree: z.string(),
      dates: z.string(),
    }),
  ),
  certifications: z.array(z.string()),
});

export type Cv = z.infer<typeof cvSchema>;

/** Non-empty location/phone/email, in display order. */
export function contactBasicParts(cv: Cv): string[] {
  return [cv.contact.location, cv.contact.phone, cv.contact.email].filter(
    Boolean,
  );
}

/** contactBasicParts plus any links, in display order. */
export function contactParts(cv: Cv): string[] {
  return [...contactBasicParts(cv), ...cv.contact.links.filter(Boolean)];
}

const MAX_SUMMARY_CHARS = 480;
const MAX_SKILL_GROUPS = 5;
const MAX_SKILL_ITEMS_PER_GROUP = 8;
const MAX_EXPERIENCE_ENTRIES = 5;
const MAX_BULLETS_RECENT = 7;
const MAX_BULLETS_OLDER = 3;
const MAX_EDUCATION_ENTRIES = 4;
const MAX_CERTIFICATIONS = 8;

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxChars).trimEnd()}…`;
}

/**
 * Deterministically trims a generated CV down to what fits on one printed
 * page, regardless of how verbose the underlying model was. Recency-weighted:
 * the two most recent roles keep more bullets than older ones.
 */
export function fitToOnePage(cv: Cv): Cv {
  return {
    ...cv,
    summary: truncateText(cv.summary, MAX_SUMMARY_CHARS),
    skillGroups: cv.skillGroups.slice(0, MAX_SKILL_GROUPS).map((g) => ({
      ...g,
      items: g.items.slice(0, MAX_SKILL_ITEMS_PER_GROUP),
    })),
    experience: cv.experience
      .slice(0, MAX_EXPERIENCE_ENTRIES)
      .map((job, i) => ({
        ...job,
        bullets: job.bullets.slice(
          0,
          i < 2 ? MAX_BULLETS_RECENT : MAX_BULLETS_OLDER,
        ),
      })),
    education: cv.education.slice(0, MAX_EDUCATION_ENTRIES),
    certifications: cv.certifications.slice(0, MAX_CERTIFICATIONS),
  };
}
