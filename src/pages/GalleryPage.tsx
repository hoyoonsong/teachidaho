import { GallerySection } from "../components/GallerySection";
import type { GalleryImage } from "../data/galleryData";

type GalleryPageProps = {
  mixedGallery: GalleryImage[];
};

export function GalleryPage({ mixedGallery }: GalleryPageProps) {
  return (
    <main>
      <GallerySection
        title="Teach Idaho Gallery"
        subtitle="A curated mix of International Economic Summit and Pitch Competition moments."
        images={mixedGallery}
      />
    </main>
  );
}
