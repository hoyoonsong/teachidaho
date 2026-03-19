import { useEffect, useState } from "react";
import econProgramLogo from "../assets/program-logo-econ.png";
import entrepreneurProgramLogo from "../assets/program-logo-entrepreneur.png";
import type { GalleryImage } from "../data/galleryData";

type HomePageProps = {
  onNavigate: (to: string) => void;
  menuImages: GalleryImage[];
  missionImages: GalleryImage[];
};

export function HomePage({
  onNavigate,
  menuImages,
  missionImages,
}: HomePageProps) {
  const heroImages = menuImages;
  const [mobileSlide, setMobileSlide] = useState(0);
  const [mobileMissionSlide, setMobileMissionSlide] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMobileSlide((current) => (current + 1) % heroImages.length);
    }, 4500);
    return () => window.clearInterval(interval);
  }, [heroImages.length]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMobileMissionSlide((current) => (current + 1) % missionImages.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [missionImages.length]);

  return (
    <main>
      <div className="md:flex md:h-[calc(100svh-72px)] md:flex-col md:-translate-y-4">
        <section className="border-b border-slate-200 bg-white md:basis-[56%] lg:basis-[60%]">
          <div className="mx-auto w-[min(94vw,1500px)] px-6 pt-10 pb-12 sm:pt-12 md:flex md:h-full md:flex-col md:justify-start md:pt-4 md:pb-4 lg:justify-center lg:py-8">
            <div>
              <h1 className="max-w-6xl text-[clamp(2.7rem,4.2vw,4.8rem)] font-black leading-[1.08] tracking-tight text-slate-900 md:whitespace-nowrap xl:-translate-y-6">
                Teaching Idaho students by doing.
              </h1>
              <div className="mt-8 hidden gap-5 md:grid md:grid-cols-3">
                {heroImages.map((image) => (
                  <img
                    key={image.alt}
                    src={image.src}
                    alt={image.alt}
                    className="h-[clamp(11.6rem,18vh,16.6rem)] w-full rounded-2xl object-cover lg:h-[clamp(12.5rem,20vh,20rem)]"
                  />
                ))}
              </div>
            </div>
            <div className="mt-6 md:hidden">
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <img
                  src={heroImages[mobileSlide].src}
                  alt={heroImages[mobileSlide].alt}
                  className="h-[clamp(15rem,58vw,22rem)] w-full object-cover"
                />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setMobileSlide(
                      (current) =>
                        (current - 1 + heroImages.length) % heroImages.length,
                    )
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700"
                >
                  Prev
                </button>
                <div className="flex gap-2">
                  {heroImages.map((image, index) => (
                    <button
                      key={image.alt}
                      type="button"
                      onClick={() => setMobileSlide(index)}
                      className={`h-2.5 w-2.5 rounded-full ${
                        mobileSlide === index ? "bg-slate-900" : "bg-slate-300"
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setMobileSlide(
                      (current) => (current + 1) % heroImages.length,
                    )
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full border-y border-slate-200 bg-slate-100 py-8 sm:py-10 md:basis-[44%] md:py-4 lg:basis-[40%] lg:py-6">
          <div className="mx-auto w-[min(94vw,1500px)] px-6 md:flex md:h-full md:flex-col md:justify-start md:pt-0 xl:justify-center">
            <h3 className="text-[clamp(2rem,2.8vw,2.4rem)] font-bold tracking-tight text-slate-900">
              Programs
            </h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => onNavigate("/info/econsummit")}
                className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-indigo-300 lg:p-[clamp(0.85rem,1.1vw,1.15rem)]"
              >
                <p className="text-[clamp(0.95rem,1.05vw,1.1rem)] font-semibold text-slate-900">
                  International Economic Summit
                </p>
                <img
                  src={econProgramLogo}
                  alt="International Economic Summit logo"
                  className="mt-2 h-[5rem] w-full rounded-lg border border-slate-100 bg-white object-contain p-2 lg:h-[clamp(5.4rem,7vw,7.1rem)]"
                />
              </button>
              <button
                type="button"
                onClick={() => onNavigate("/info/pitch-competition")}
                className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-orange-300 lg:p-[clamp(0.85rem,1.1vw,1.15rem)]"
              >
                <p className="text-[clamp(0.95rem,1.05vw,1.1rem)] font-semibold text-slate-900">
                  Idaho High School Entrepreneurs Challenge
                </p>
                <img
                  src={entrepreneurProgramLogo}
                  alt="Idaho Entrepreneur Challenge logo"
                  className="mt-2 h-[5rem] w-full rounded-lg border border-slate-100 bg-white object-contain p-2 lg:h-[clamp(5.4rem,7vw,7.1rem)]"
                />
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="border-b border-slate-200 bg-white py-16">
        <div className="mx-auto grid w-[min(94vw,1500px)] gap-10 px-6 lg:grid-cols-2">
          <div>
            <h3 className="text-[clamp(2rem,2.8vw,2.4rem)] font-bold tracking-tight text-slate-900">
              Our Mission
            </h3>
            <p className="mt-4 text-base leading-7 text-slate-700">
              Teach Idaho creates learning experiences where students build
              confidence, practice leadership, and connect classroom ideas to
              real opportunities.
            </p>
            <p className="mt-3 text-base leading-7 text-slate-700">
              Through hands-on programs like the International Economic Summit
              and Idaho High School Entrepreneurs Challenge, students
              collaborate, pitch, and solve real-world problems.
            </p>
            <p className="mt-3 text-base leading-7 text-slate-700">
              We also create a supportive community for educators throughout the
              state, where they can share ideas, resources, and learn from each
              other.
            </p>
            <button
              type="button"
              onClick={() => onNavigate("/gallery")}
              className="mt-6 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Visit Full Gallery
            </button>
          </div>
          <div className="md:hidden">
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <img
                src={missionImages[mobileMissionSlide].src}
                alt={missionImages[mobileMissionSlide].alt}
                className="h-64 w-full object-cover"
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setMobileMissionSlide(
                    (current) =>
                      (current - 1 + missionImages.length) %
                      missionImages.length,
                  )
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700"
              >
                Prev
              </button>
              <div className="flex gap-2">
                {missionImages.map((image, index) => (
                  <button
                    key={image.alt}
                    type="button"
                    onClick={() => setMobileMissionSlide(index)}
                    className={`h-2.5 w-2.5 rounded-full ${
                      mobileMissionSlide === index
                        ? "bg-slate-900"
                        : "bg-slate-300"
                    }`}
                    aria-label={`Go to mission slide ${index + 1}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setMobileMissionSlide(
                    (current) => (current + 1) % missionImages.length,
                  )
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700"
              >
                Next
              </button>
            </div>
          </div>
          <div className="hidden gap-4 md:grid md:grid-cols-2">
            {missionImages.map((image) => (
              <img
                key={image.alt}
                src={image.src}
                alt={image.alt}
                className="h-48 w-full rounded-2xl object-cover lg:h-52"
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
