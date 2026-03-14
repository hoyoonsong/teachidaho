import { ProgramPageLayout } from "../components/ProgramPageLayout";
import { econImages } from "../data/galleryData";

export function EconSummitPage() {
  return (
    <ProgramPageLayout
      title="International Economic Summit"
      accentClass="text-indigo-700"
      description="The International Economic Summit is a hands-on, global learning experience where students represent countries, build cultural and economic projects, and practice leadership through real-world collaboration."
      highlights={[
        "Students build and present country-based projects.",
        "Program emphasizes economics, communication, and leadership.",
        "Teams collaborate in a summit-style, real-world event format.",
      ]}
      learnMoreUrl="https://www.facebook.com/EconSummit/"
      learnMoreLabel="Learn More on Facebook"
      images={econImages}
    />
  );
}
