import { ProgramPageLayout } from "../components/ProgramPageLayout";
import { pitchImages } from "../data/galleryData";

export function PitchCompetitionPage() {
  return (
    <ProgramPageLayout
      title="Idaho High School Entrepreneurs Challenge"
      accentClass="text-orange-600"
      description="The High School Idaho Entrepreneur Challenge helps students learn startup concepts, develop venture ideas, and pitch to community leaders for cash prizes."
      highlights={[
        "Open to all Idaho high school students.",
        "Build entrepreneurial skills with mentor support.",
        "Culminates in a live pitch competition and prizes.",
      ]}
      learnMoreUrl="https://www.boisestate.edu/venturecollege/high-school-idaho-entrepreneur-challenge/"
      learnMoreLabel="Learn More from Venture College"
      images={pitchImages}
    />
  );
}
