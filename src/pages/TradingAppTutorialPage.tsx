import { useEffect } from "react";
import alliesScreenshot from "../assets/tradingapp/allies.jpeg";
import assetsScreenshot from "../assets/tradingapp/assets.jpeg";
import myContractsScreenshot from "../assets/tradingapp/my-contracts.jpeg";
import tradeScreenshot from "../assets/tradingapp/trade.jpeg";

const tradingAppUrl = "https://mockmarket-68ceb.web.app/";

const tutorialSections = [
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
      "Open the Countries tab to browse every team in the summit. Allied countries are marked with a green border and an ALLIED label; you can trade with these countries without being charged tariffs.  Tap a country to see their resources, and tap the trade button to start trading with them.",
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
      "Contracts are an easy way to stay organized in what trades you've promised to complete.  Go up to the admin desk with the country you want to trade with, and sign a contract together.  Once the trading session starts, hit the trade icon to initiate the trade.",
  },
] as const;

function scrollToSectionSlug(slug: string) {
  const el = document.getElementById(slug);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function TradingAppTutorialPage() {
  useEffect(() => {
    const scrollFromHash = () => {
      const slug = window.location.hash.replace(/^#/, "");
      if (!slug) return;
      scrollToSectionSlug(slug);
    };

    scrollFromHash();
    window.addEventListener("hashchange", scrollFromHash);
    return () => window.removeEventListener("hashchange", scrollFromHash);
  }, []);

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
                Use this guide to learn the main screens in the trading app.
                Students trade resources with other countries to meet the goals
                their team set for their country.
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
                {tutorialSections.map((section) => (
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

      {tutorialSections.map((section, index) => (
        <section
          key={section.slug}
          id={section.slug}
          className={
            index % 2 === 0
              ? "scroll-mt-24 border-b border-slate-200 bg-slate-50"
              : "scroll-mt-24 border-b border-slate-200 bg-white"
          }
        >
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
                alt={section.alt}
                className="mx-auto w-full max-w-sm"
              />
            </figure>
          </div>
        </section>
      ))}
    </main>
  );
}
