import { useEffect, useState } from "react";
import alliesScreenshot from "../assets/tradingapp/allies.jpeg";
import assetsScreenshot from "../assets/tradingapp/assets.jpeg";
import myContractsScreenshot from "../assets/tradingapp/my-contracts.jpeg";
import tradeScreenshot from "../assets/tradingapp/trade.jpeg";

const tradingAppUrl = "https://mockmarket-68ceb.web.app/";

type Audience = "student" | "teacher";

type TutorialSection = {
  slug: string;
  title: string;
  description: string;
  image?: string;
  alt?: string;
};

const studentSections: TutorialSection[] = [
  {
    slug: "assets",
    title: "Your country's assets",
    image: assetsScreenshot,
    alt: "Assets screen showing food, raw materials, and other resources for Brazil",
    description:
      "The Assets tab shows how many units of each resource your country holds and how close you are to your import goals. Use the numbers on the left to see current stock, and check Total Imported (for example, 4/4) to see whether you still need to trade for that category.",
  },
  {
    slug: "countries",
    title: "Countries and allies",
    image: alliesScreenshot,
    alt: "Countries list showing allied countries with alliance level",
    description:
      "Open the Countries tab to browse every team in the summit. Allied countries are marked with a green border and an ALLIED label; you can trade with these countries without being charged tariffs. Tap a country to see their resources, and tap the trade button to start trading with them.",
  },
  {
    slug: "trade",
    title: "Making a trade",
    image: tradeScreenshot,
    alt: "Trade screen negotiating an offer with Chile",
    description:
      "When you trade with another country, your offer appears under Your offer and theirs under their country's name. You'll also see a preview of the expected tariffs for countries not in your alliance. Once both sides have proposed resources, tap Approve to finalize the deal.",
  },
  {
    slug: "contracts",
    title: "My contracts",
    image: myContractsScreenshot,
    alt: "My Contracts screen listing an active trade with Chile",
    description:
      "Contracts are an easy way to stay organized in what trades you've promised to complete. Go up to the admin desk with the country you want to trade with, and sign a contract together. Once the trading session starts, hit the trade icon to initiate the trade.",
  },
];

const teacherSections: TutorialSection[] = [
  {
    slug: "teacher-prep",
    title: "Before the trading session",
    description:
      "Confirm your class is registered for the summit and each team knows their country assignment. Review import goals with students so they understand what resources they still need. Share the student tutorial on this page so teams can practice navigating the app before the live trading window.",
  },
  {
    slug: "teacher-contracts",
    title: "Signing contracts at the admin desk",
    description:
      "Before trading opens, countries negotiate agreements on paper at the admin desk. Both teams should agree on what each country will send and receive, then sign the contract. Those agreements are what students later enter in the app under My Contracts when the trading session begins.",
  },
  {
    slug: "teacher-session",
    title: "During the trading session",
    description:
      "When trading is open, students execute deals in the app that match their signed contracts. Circulate among teams to answer questions about allies, tariffs, and offer approval. If a trade stalls, remind students that both countries must propose resources and tap Approve before the exchange completes.",
  },
  {
    slug: "teacher-support",
    title: "Helping students in the app",
    description:
      "You do not need to trade on behalf of students, but knowing the main screens helps you troubleshoot quickly. Use the student tutorial tabs on this page as a reference: Assets for progress toward goals, Countries for finding partners, Trades for active negotiations, and Contracts for deals already agreed to on paper.",
  },
];

const audienceTabs: { id: Audience; label: string }[] = [
  { id: "student", label: "Student tutorial" },
  { id: "teacher", label: "Teacher tutorial" },
];

function scrollToSectionSlug(slug: string) {
  const el = document.getElementById(slug);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function audienceForHash(hash: string): Audience | null {
  if (!hash) return null;
  if (hash.startsWith("teacher-")) return "teacher";
  if (studentSections.some((s) => s.slug === hash)) return "student";
  if (teacherSections.some((s) => s.slug === hash)) return "teacher";
  return null;
}

function TutorialSectionBlock({
  section,
  index,
}: {
  section: TutorialSection;
  index: number;
}) {
  const bgClass =
    index % 2 === 0
      ? "scroll-mt-24 border-b border-slate-200 bg-slate-50"
      : "scroll-mt-24 border-b border-slate-200 bg-white";

  if (!section.image) {
    return (
      <section key={section.slug} id={section.slug} className={bgClass}>
        <div className="mx-auto max-w-3xl px-6 py-10 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            {section.title}
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-700">
            {section.description}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section key={section.slug} id={section.slug} className={bgClass}>
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-2 lg:items-center lg:px-8">
        <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            {section.title}
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-700">
            {section.description}
          </p>
        </div>
        <figure
          className={`overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm ${index % 2 === 1 ? "lg:order-1" : ""}`}
        >
          <img
            src={section.image}
            alt={section.alt ?? ""}
            className="mx-auto w-full max-w-sm"
          />
        </figure>
      </div>
    </section>
  );
}

export function TradingAppTutorialPage() {
  const [audience, setAudience] = useState<Audience>("student");

  const activeSections =
    audience === "student" ? studentSections : teacherSections;

  useEffect(() => {
    const scrollFromHash = () => {
      const slug = window.location.hash.replace(/^#/, "");
      if (!slug) return;

      const tab = audienceForHash(slug);
      if (tab) setAudience(tab);

      requestAnimationFrame(() => scrollToSectionSlug(slug));
    };

    scrollFromHash();
    window.addEventListener("hashchange", scrollFromHash);
    return () => window.removeEventListener("hashchange", scrollFromHash);
  }, []);

  const selectAudience = (next: Audience) => {
    setAudience(next);
    const slug = window.location.hash.replace(/^#/, "");
    const slugBelongsToStudent = studentSections.some((s) => s.slug === slug);
    const slugBelongsToTeacher = teacherSections.some((s) => s.slug === slug);
    if (
      (next === "student" && slugBelongsToTeacher) ||
      (next === "teacher" && slugBelongsToStudent)
    ) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }
  };

  return (
    <main>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold uppercase tracking-widest text-indigo-700">
                International Economic Summit
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
                Trading App Tutorial
              </h1>
              <p className="mt-4 max-w-4xl text-base leading-7 text-slate-700">
                Guides for students using the trading app and for teachers
                supporting teams during the summit.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <a
                  href={tradingAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Open Trading App
                </a>
                <a
                  href="/info/econsummit"
                  className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  Econ Summit Info
                </a>
              </div>
            </div>

            <nav
              aria-label="Tutorial sections"
              className="shrink-0 lg:w-56 xl:w-64"
            >
              <p className="text-sm font-semibold text-slate-900">
                Jump to a section
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {activeSections.map((section) => (
                  <li key={section.slug}>
                    <a
                      href={`#${section.slug}`}
                      className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-white"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
          <div
            role="tablist"
            aria-label="Tutorial audience"
            className="flex flex-col gap-2 sm:flex-row sm:gap-3"
          >
            {audienceTabs.map((tab) => {
              const active = audience === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectAudience(tab.id)}
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition sm:min-w-[180px] sm:flex-1 sm:py-3 sm:text-base ${
                    active
                      ? "bg-slate-900 text-white ring-2 ring-slate-900 ring-offset-2"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {activeSections.map((section, index) => (
        <TutorialSectionBlock
          key={section.slug}
          section={section}
          index={index}
        />
      ))}
    </main>
  );
}
