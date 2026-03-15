import { useEffect, useState } from "react";
import type { GalleryImage } from "../data/galleryData";

type GallerySectionProps = {
  title: string;
  subtitle: string;
  images: GalleryImage[];
};

export function GallerySection({
  //title,
  subtitle,
  images,
}: GallerySectionProps) {
  const [visibleCount, setVisibleCount] = useState(6);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeImage = activeIndex === null ? null : images[activeIndex];

  useEffect(() => {
    if (activeIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowRight") {
        setActiveIndex((prev) => {
          if (prev === null) return prev;
          return (prev + 1) % images.length;
        });
      }
      if (event.key === "ArrowLeft") {
        setActiveIndex((prev) => {
          if (prev === null) return prev;
          return (prev - 1 + images.length) % images.length;
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, images]);

  return (
    <section className="border-y border-slate-200 bg-white py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-3xl">
              Gallery
            </h2>
            <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          </div>
          <a
            href="https://www.facebook.com/TeachIdaho/photos"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            More on Facebook
          </a>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.slice(0, visibleCount).map((image, index) => (
            <button
              key={image.alt}
              type="button"
              onClick={() => setActiveIndex(index)}
              className="overflow-hidden rounded-2xl border border-slate-200 text-left"
            >
              <img
                src={image.src}
                alt={image.alt}
                className="h-64 w-full object-cover transition duration-300 hover:scale-105"
                loading="lazy"
              />
            </button>
          ))}
        </div>

        {visibleCount < images.length && (
          <button
            type="button"
            onClick={() =>
              setVisibleCount((count) => Math.min(count + 6, images.length))
            }
            className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Show More
          </button>
        )}
      </div>

      {activeImage && (
        <div
          role="presentation"
          onClick={() => setActiveIndex(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4"
        >
          <div
            className="relative max-h-[90vh] max-w-6xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveIndex(null)}
              className="absolute -right-2 -top-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-900"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() =>
                setActiveIndex((prev) => {
                  if (prev === null) return prev;
                  return (prev - 1 + images.length) % images.length;
                })
              }
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-lg font-bold text-slate-900"
              aria-label="Previous image"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() =>
                setActiveIndex((prev) => {
                  if (prev === null) return prev;
                  return (prev + 1) % images.length;
                })
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-3 py-2 text-lg font-bold text-slate-900"
              aria-label="Next image"
            >
              →
            </button>
            <img
              src={activeImage.src}
              alt={activeImage.alt}
              className="max-h-[88vh] w-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
