import { useEffect, useMemo, useState } from "react";
import { ContactButtons } from "./components/ContactButtons";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import {
  buildMixedGallery,
  homeMenuImages,
  homeMissionImages,
} from "./data/galleryData";
import { EconSummitPage } from "./pages/EconSummitPage";
import { GalleryPage } from "./pages/GalleryPage";
import { HomePage } from "./pages/HomePage";
import { PitchCompetitionPage } from "./pages/PitchCompetitionPage";

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const mixedGallery = useMemo(() => buildMixedGallery(), []);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (to: string) => {
    if (to === path) return;
    window.history.pushState({}, "", to);
    setPath(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isKnownPath = [
    "/",
    "/gallery",
    "/econsummit",
    "/pitch-competition",
  ].includes(path);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <SiteHeader currentPath={path} onNavigate={navigate} />
      {path === "/" && (
        <HomePage
          onNavigate={navigate}
          menuImages={homeMenuImages}
          missionImages={homeMissionImages}
        />
      )}
      {path === "/gallery" && <GalleryPage mixedGallery={mixedGallery} />}
      {path === "/econsummit" && <EconSummitPage />}
      {path === "/pitch-competition" && <PitchCompetitionPage />}
      {!isKnownPath && (
        <main className="mx-auto max-w-5xl px-6 py-20">
          <h1 className="text-4xl font-black text-slate-900">Page not found</h1>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          >
            Back to Home
          </button>
        </main>
      )}
      {path === "/" && <ContactButtons />}
      <SiteFooter />
    </div>
  );
}

export default App;
