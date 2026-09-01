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
  skills: z.array(z.string()),
  experience: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
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

/** Non-empty email/phone/location, in display order. */
export function contactBasicParts(cv: Cv): string[] {
  return [cv.contact.email, cv.contact.phone, cv.contact.location].filter(
    Boolean,
  );
}

/** contactBasicParts plus any links, in display order. */
export function contactParts(cv: Cv): string[] {
  return [...contactBasicParts(cv), ...cv.contact.links.filter(Boolean)];
}
