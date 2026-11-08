import { contactParts, type Cv } from "@/lib/schema";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[12px] font-bold text-accent uppercase tracking-wide border-b border-accent/25 pb-1 mb-2.5">
      {children}
    </h3>
  );
}

function DateRight({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] text-text-secondary shrink-0 whitespace-nowrap">
      {children}
    </p>
  );
}

export function CvPreview({ cv }: { cv: Cv }) {
  const contactLine = contactParts(cv).join("  ·  ");

  return (
    <div className="flex flex-col gap-4 text-[13px] leading-snug">
      <div>
        <h2 className="text-[26px] font-bold tracking-tight">{cv.name}</h2>
        {cv.title && (
          <p className="text-[13.5px] font-semibold text-text-secondary mt-1">
            {cv.title}
          </p>
        )}
        {contactLine && (
          <p className="text-[12px] text-text-secondary mt-1">
            {contactLine}
          </p>
        )}
      </div>

      {cv.summary && (
        <section>
          <SectionHeading>Summary</SectionHeading>
          <p>{cv.summary}</p>
        </section>
      )}

      {cv.skillGroups.length > 0 && (
        <section>
          <SectionHeading>Core skills</SectionHeading>
          <div className="flex flex-col gap-1">
            {cv.skillGroups.map((group, i) => (
              <div key={i} className="flex gap-3">
                <p className="w-[168px] shrink-0 font-semibold">
                  {group.label}
                </p>
                <p className="text-text-secondary">
                  {group.items.join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {cv.experience.length > 0 && (
        <section>
          <SectionHeading>Experience</SectionHeading>
          <div className="flex flex-col gap-3">
            {cv.experience.map((job, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold">
                    {job.role} — {job.company}
                  </p>
                  {job.dates && <DateRight>{job.dates}</DateRight>}
                </div>
                {job.location && (
                  <p className="text-[12px] italic text-text-secondary">
                    {job.location}
                  </p>
                )}
                {job.bullets.length > 0 && (
                  <ul className="mt-1 list-disc list-outside ml-4 space-y-0.5 text-text-secondary marker:text-hairline">
                    {job.bullets.map((b, j) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {cv.education.length > 0 && (
        <section>
          <SectionHeading>Education</SectionHeading>
          <div className="flex flex-col gap-0.5">
            {cv.education.map((edu, i) => (
              <div key={i} className="flex items-baseline justify-between gap-3">
                <p>
                  <span className="font-medium">{edu.degree}</span>
                  {edu.school && `, ${edu.school}`}
                </p>
                {edu.dates && <DateRight>{edu.dates}</DateRight>}
              </div>
            ))}
          </div>
        </section>
      )}

      {cv.certifications.length > 0 && (
        <section>
          <SectionHeading>Certifications</SectionHeading>
          <p className="text-text-secondary">
            {cv.certifications.join("  ·  ")}
          </p>
        </section>
      )}
    </div>
  );
}
