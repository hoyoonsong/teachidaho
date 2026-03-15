import { GallerySection } from "../components/GallerySection";
import { econImages } from "../data/galleryData";

export function EconSummitPage() {
  return (
    <main>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-700">
            Teach Idaho
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
            International Economic Summit
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-slate-700">
            The International Economic Summit is a hands-on, global learning
            experience where students represent countries, build cultural and
            economic projects, and practice leadership through real-world
            collaboration.
          </p>
          <ul className="mt-5 list-disc space-y-2 pl-5 text-sm text-slate-700 marker:text-indigo-600">
            <li>Students build and present country-based projects.</li>
            <li>
              Program emphasizes economics, communication, and leadership.
            </li>
            <li>
              Teams collaborate in a summit-style, real-world event format.
            </li>
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
        title="International Economic Summit Gallery"
        subtitle="Click any image to view larger."
        images={econImages}
      />
    </main>
  );
}
