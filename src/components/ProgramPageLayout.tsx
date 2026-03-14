import { GallerySection } from "./GallerySection";
import type { GalleryImage } from "../data/galleryData";

type ProgramPageLayoutProps = {
  title: string;
  accentClass: string;
  description: string;
  highlights: string[];
  learnMoreUrl: string;
  learnMoreLabel: string;
  images: GalleryImage[];
};

export function ProgramPageLayout({
  title,
  accentClass,
  description,
  highlights,
  learnMoreUrl,
  learnMoreLabel,
  images,
}: ProgramPageLayoutProps) {
  return (
    <main>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <p
            className={`text-sm font-semibold uppercase tracking-widest ${accentClass}`}
          >
            Teach Idaho
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-slate-700">
            {description}
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {highlights.map((highlight) => (
              <p
                key={highlight}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              >
                {highlight}
              </p>
            ))}
          </div>
          <div className="mt-5">
            <a
              href={learnMoreUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              {learnMoreLabel}
            </a>
          </div>
        </div>
      </section>
      <GallerySection
        title={`${title} Gallery`}
        subtitle="Click any image to view larger."
        images={images}
      />
    </main>
  );
}
