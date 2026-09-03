import { memo } from "react";
import { contactParts, type Cv } from "@/lib/schema";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide mb-2">
      {children}
    </h3>
  );
}

// The rendered CV only depends on `cv`, which is stable except when a new
// CV is generated or a history entry is selected — memoize so unrelated
// edits to the CV/JD text (which don't change `cv`) don't re-render it.
function CvPreviewComponent({ cv }: { cv: Cv }) {
  const contactLine = contactParts(cv).join("  ·  ");

  return (
    <div className="flex flex-col gap-7 text-[15px] leading-relaxed">
      <div>
        <h2 className="text-[28px] font-semibold tracking-tight">{cv.name}</h2>
        {cv.title && <p className="text-text-secondary mt-0.5">{cv.title}</p>}
        {contactLine && (
          <p className="text-[13px] text-text-secondary mt-2">{contactLine}</p>
        )}
      </div>

      {cv.summary && (
        <section>
          <SectionLabel>Summary</SectionLabel>
          <p>{cv.summary}</p>
        </section>
      )}

      {cv.skills.length > 0 && (
        <section>
          <SectionLabel>Skills</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {cv.skills.map((skill, i) => (
              <span
                key={i}
                className="rounded-full bg-fill-secondary px-2.5 py-1 text-[13px]"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {cv.experience.length > 0 && (
        <section>
          <SectionLabel>Experience</SectionLabel>
          <div className="flex flex-col gap-5">
            {cv.experience.map((job, i) => (
              <div key={i}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">
                    {job.role}{" "}
                    <span className="text-text-secondary">— {job.company}</span>
                  </p>
                  {job.dates && (
                    <p className="text-[13px] text-text-secondary shrink-0">
                      {job.dates}
                    </p>
                  )}
                </div>
                <ul className="mt-1.5 list-disc list-outside ml-4 space-y-1 text-text-secondary marker:text-hairline">
                  {job.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {cv.education.length > 0 && (
        <section>
          <SectionLabel>Education</SectionLabel>
          <ul className="space-y-1">
            {cv.education.map((edu, i) => (
              <li key={i}>
                <span className="font-medium">{edu.degree}</span>
                <span className="text-text-secondary">
                  , {edu.school}
                  {edu.dates && ` (${edu.dates})`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {cv.certifications.length > 0 && (
        <section>
          <SectionLabel>Certifications</SectionLabel>
          <ul className="list-disc list-outside ml-4 space-y-1 text-text-secondary">
            {cv.certifications.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export const CvPreview = memo(CvPreviewComponent);
