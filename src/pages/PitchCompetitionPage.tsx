import { GallerySection } from "../components/GallerySection";
import { pitchImages } from "../data/galleryData";

export function PitchCompetitionPage() {
  return (
    <main>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-orange-600">
            Teach Idaho
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
            Idaho High School Entrepreneurs Challenge
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-slate-700">
            The High School Idaho Entrepreneur Challenge--in partnership with
            Boise State University's{" "}
            <a
              href="https://www.boisestate.edu/venturecollege/"
              target="_blank"
              rel="noreferrer"
              className="text-orange-600 hover:text-orange-700"
            >
              Venture College
            </a>{" "}
            helps students learn startup concepts, develop venture ideas, and
            pitch to community leaders for cash prizes.
          </p>
          <ul className="mt-5 list-disc space-y-2 pl-5 text-sm text-slate-700 marker:text-orange-500">
            <li>Open to all Idaho high school students.</li>
            <li>Build entrepreneurial skills with mentor support.</li>
            <li>Culminates in a live pitch competition and prizes.</li>
          </ul>
          <p className="mt-5 text-sm text-slate-700">
            Are you a teacher? Register your students now!
          </p>
          <div className="mt-2">
            <a
              href="/participants/register"
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Register Now
            </a>
          </div>
        </div>
      </section>
      <GallerySection
        title="Idaho High School Entrepreneurs Challenge Gallery"
        subtitle="Click any image to view larger."
        images={pitchImages}
      />
    </main>
  );
}
