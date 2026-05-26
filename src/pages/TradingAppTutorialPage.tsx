import { useEffect, useState } from "react";
import alliesScreenshot from "../assets/tradingapp/allies.png";
import assetsScreenshot from "../assets/tradingapp/assets.png";
import myContractsScreenshot from "../assets/tradingapp/my-contracts.png";
import contractDetailScreenshot from "../assets/tradingapp/contract-detail.png";
import tradeScreenshot from "../assets/tradingapp/trade.png";
import adminTeamsScreenshot from "../assets/tradingapp/admin-teams.png";
import adminFinalizeContractScreenshot from "../assets/tradingapp/admin-finalize-contract.png";
import adminAllContractsScreenshot from "../assets/tradingapp/admin-all-contracts.png";
import adminTradesScreenshot from "../assets/tradingapp/admin-trades.png";
import adminUsScreenshot from "../assets/tradingapp/admin-us.png";

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
    alt: "Assets screen showing food, raw materials, and other resources for Costa Rica",
    description:
      "The Assets tab shows how many units of each resource your country holds and how close you are to your import goals.  The large number in green is the total you have both from domestic production and from trading with other countries.  A resource tile will turn green once you reach your import goal.",
  },
  {
    slug: "countries",
    title: "Countries and allies",
    image: alliesScreenshot,
    alt: "Countries list showing allied countries with alliance level",
    description:
      "Open the Countries tab to browse every team in the summit. Allied countries are marked with a green border; you can trade with these countries without being charged tariffs. Tap a country to see their resources, and tap the trade button to start trading with them.",
  },
  {
    slug: "contracts",
    title: "Viewing your contracts",
    image: myContractsScreenshot,
    alt: "My Contracts screen listing an active trade with Chile",
    description:
      "Contracts are an easy way to stay organized in what trades you've promised to complete. Go up to the admin desk with the country you want to trade with, and sign a contract together.  Contracts are automatically marked completed once the resources are exchanged.",
  },
  {
    slug: "contract-detail",
    title: "Making trades from your contracts",
    image: contractDetailScreenshot,
    alt: "Contract details screen showing the resources you will be trading and receiving",
    description:
      "When you tap a contract, you can see the details of the trade.  You can see the resources you will be trading and receiving.   Once the trading session starts, hit the trade icon to initiate the trade.",
  },
  {
    slug: "trade",
    title: "Making trade offers",
    image: tradeScreenshot,
    alt: "Trade screen negotiating an offer with Chile",
    description:
      "Communicate with the other country to decide what resources to trade. Once both sides have proposed resources, tap Approve to finalize the deal.  A tariff will be charged for each resource imported from a country not in your alliance.",
  },
];

const teacherSections: TutorialSection[] = [
  {
    slug: "teacher-teams",
    title: "Teams, alliances, and inventory",
    image: adminTeamsScreenshot,
    alt: "Admin Teams screen with country list, alliance management, and inventory for Austria",
    description:
      "Open the Teams tab to manage every country in the summit. Select a country on the left to see its alliance and resource counts. Use the middle panel to move a country into an alliance or remove it, and create new alliances with the plus button. The inventory panel on the right shows each resource category; tap the pencil icon to adjust counts when you need to correct a team's holdings.",
  },
  {
    slug: "teacher-contracts",
    title: "Creating contracts at the admin desk",
    image: adminFinalizeContractScreenshot,
    alt: "Admin Contracts screen building Belarus offers and selecting a trading partner",
    description:
      "When two countries agree on a deal at the admin desk, open the Contracts tab and select the first country from the list on the right. Use the plus and minus buttons to enter what that country will send. Select the second country, set their side of the deal, and tap Finalize Contract. Students will see the agreement in My Contracts once trading opens. Use View All Contracts in the corner to jump to the full list.",
  },
  {
    slug: "teacher-all-contracts",
    title: "Viewing all contracts",
    image: adminAllContractsScreenshot,
    alt: "All Contracts screen listing pending and completed trades between countries",
    description:
      "The All Contracts view shows every agreement in the summit. Search by country name or contract ID, or filter to Pending or Completed. Each card shows both countries, the resources each will exchange, and whether the contract is still waiting on trades or already finished. Tap a contract to open its details when you need to verify what was signed.",
  },
  {
    slug: "teacher-trades",
    title: "Monitoring trades and tariffs",
    image: adminTradesScreenshot,
    alt: "Admin Trades screen listing completed trades with tariff due and paid status",
    description:
      "The Trades tab lists every completed exchange in the app. Filter to All with Tariffs or Unpaid Tariffs to focus on deals that still owe import taxes. Trades marked Tariffs Due show a Pay Tariff button for each country that owes units; tap it when a team has paid their tariff at the admin desk. Trades marked Tariffs Paid are fully settled.",
  },
  {
    slug: "teacher-united-states",
    title: "United States trades",
    image: adminUsScreenshot,
    alt: "United States admin screen to force a completed trade with another country",
    description:
      "The United States can be played by students like a normal country, or this tab can be used at the admin desk to executively complete trades with other countries."
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
  const [enlarged, setEnlarged] = useState(false);
  const bgClass =
    index % 2 === 0
      ? "scroll-mt-24 border-b border-slate-200 bg-slate-50"
      : "scroll-mt-24 border-b border-slate-200 bg-white";

  useEffect(() => {
    if (!enlarged) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEnlarged(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enlarged]);

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
          <button
            type="button"
            onClick={() => setEnlarged(true)}
            className="block w-full cursor-zoom-in transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            aria-label={`Enlarge screenshot: ${section.alt ?? section.title}`}
          >
            <img
              src={section.image}
              alt={section.alt ?? ""}
              className="mx-auto w-full max-h-[70vh] object-contain"
            />
          </button>
        </figure>
      </div>

      {enlarged && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={section.alt ?? section.title}
          onClick={() => setEnlarged(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4"
        >
          <div
            className="relative max-h-[90vh] max-w-6xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setEnlarged(false)}
              className="absolute -right-2 -top-2 z-10 rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-900 shadow-sm"
            >
              Close
            </button>
            <img
              src={section.image}
              alt={section.alt ?? ""}
              className="max-h-[88vh] w-auto max-w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
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
