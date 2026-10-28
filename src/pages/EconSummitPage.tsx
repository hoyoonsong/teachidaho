import { useState } from "react";
import { GallerySection } from "../components/GallerySection";
import { econImages } from "../data/galleryData";

type SummitTab = "overview" | "resume" | "preparing";

const tabs: { id: SummitTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "resume", label: "Summit Resume" },
  { id: "preparing", label: "Preparing for Summit Day" },
];

type HistoryItem = { year: string; detail: string; note?: string };

const history: HistoryItem[] = [
  {
    year: "1990",
    detail: "Created in a classroom simulation at Borah High School",
  },
  {
    year: "1992",
    detail:
      "Expanded into a schoolwide event capping off a Global Citizen project",
  },
  {
    year: "1995",
    detail: "Capital High School classes started participating",
  },
  {
    year: "1997",
    detail:
      "First Summit held at Boise State University (Jordan Ballroom) with three schools participating",
  },
  {
    year: "2000",
    detail:
      "Partnership with Idaho Council on Economic Education formed in order to deal with event growth",
  },
  { year: "2000", detail: "First Russia Summit" },
  { year: "2002", detail: "First Mexico Summit" },
  { year: "2004", detail: "First Chinese Summit" },
  {
    year: "2020",
    detail: "30th Anniversary of Continuous Summits in the US and Abroad",
  },
  {
    year: "2023",
    detail:
      "5 regional Idaho summits, regional summits in Nevada, California, and Massachusetts",
    note: "20 teachers–over 2500 students",
  },
];

const achievements = [
  "NASDAQ National Teaching Award —National Winner",
  "NASDAQ National Teaching Award --Regional Winner",
  "Grant--Idaho Department of Education for Innovative Programs",
  "Grant–Kathryn Albertson Foundation",
  "Program presentation in Moscow, Russia in 1990 for Junior Achievement at the invitation of Premier Gorbachev",
  "Larry Barnes Award for Innovation–Boise State University",
  "Idaho Governor’s Export Award",
  "Training the Writers Program—One of 12 US education programs selected for a curriculum writing program sponsored by the National Council on Economic Education in Bucharest, Romania. Twelve Eastern European programs were also selected.",
  "American Councils/ACCELS Teaching Excellence Award Winner—US Department of State program to send teachers abroad for cultural and educational exchanges—March 2002 spent three weeks in the Republic of Georgia and taught teachers the IES. Organized and carried two Summits while there.",
  "US-China Exchange “Sister School Program” in association with the Governor’s trade mission to China. Introduced and trained Chinese students from a sister school in Shanghai for the IES held in Boston. Chinese students paired with American students to form teams for four who each took one country to represent in a Summit. US students were trained by their teachers, and were able to meet and collaborate with their Chinese counterparts two times prior to the summit.",
  "US-Chinese Exchange-US teams and teachers attended Summits in Shanghai, China to compete against Chinese teams who had been trained by Summit staff in China. Our sister school in China reached out to other schools in Shanghai for a lively, full Summit event.",
  "US-China student exchange. Students from Shanghai traveled to Boston on a cultural exchange where they participated in Summit lessons side-by-side with American students. The culminating activity was an International Economic Summit at Harvard University.",
];

const learningSteps: { body: string; labels: string[] }[] = [
  {
    body: "The first step in the process is for teachers to sign up for the summit. That will include determining which summit you can attend (date), how many teams you will bring, what countries you wish, and contact information.",
    labels: ["Teacher Sign Up Form:"],
  },
  {
    body: "Secondly, sign up teams. Organize into teams of 4-5. Once a team is together, select a team leader and a treasurer for the summit. Include all team member names and emails on the Student Sign Up form. Also, indicate what country the team has been assigned.",
    labels: ["Student Sign Up Form:"],
  },
  {
    body: "The hard work starts 6-8 weeks before the summit event. Teams complete four pre-summit assignments to learn more about their countries. The first is a fact sheet. An overview of the economic situation of a country, the fact sheet gives teams basic information which they can then use to compare their country with others. This might take one class period.",
    labels: ["Fact Sheet (5 points):"],
  },
  {
    body: "Teams will now research problems and issues within their countries, which, if solved, would make their country a much better place to live and would improve the region in addition. Teams will write a proposal which will be taken to the summit with hopes that it will be presented at the summit and possibly passed into action by other countries. Summit proposals should be broad enough to give other countries a reason to vote for it.",
    labels: ["Proposal Form (5 points):"],
  },
  {
    body: "Teams must prepare a visual representation of their proposal that can be shown at the summit event. Videos are preferred and offer the most points when submitted. Teams can use other methods to explain their proposal, for fewer points. All videos must be uploaded to You Tube and must have a link to You Tube submitted to IES to receive full credit.",
    labels: [
      "Video Proposal (5 points):",
      "PPT, Prezi, Google Slides (3 points):",
    ],
  },
  {
    body: "Teams must develop a plan to improve the standard of living for their country. That plan includes determining the best imports they can acquire from their trade allies. Strategizing about how to make money at the summit, the best use of the money they have, and how to pay the fewest tariffs are part of the plan. All of the summit day activities will contribute to a successful execution of the Strategic Plan.",
    labels: ["Strategic Plan (5 points):"],
  },
  {
    body: "By studying the Summit User Guide and through participation in Summit Lessons 1-9, teams will learn the rules and protocols of the Summit Event. It is essential that teams understand the rules and the process of the summit before the big day. Taken with the team, the Certification Test is the final determinant of readiness for the summit. Teams must score 80% on the test in order to attend the summit. However, they can take the test as many times as they need to get the qualification score.",
    labels: ["Certification Test (5 points):"],
  },
];

function SummitResume() {
  return (
    <article className="max-w-4xl">
      <p className="text-sm font-semibold uppercase tracking-widest text-indigo-700">
        Created 1990 at Borah High School
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        International Economic Summit Resume
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Est. under the umbrella of TeachIdaho, 2020
      </p>

      <p className="mt-6 text-base leading-7 text-slate-700">
        The International Economic Summit (IES) has been recognized nationally
        and internationally and is currently being used in multiple states, as
        well as in Russia, China and Mexico. It was licensed by the San
        Francisco Federal Reserve (2006-09) for development in its 9 western
        states. The Chicago, New York, and Boston Feds are also considering
        leasing the summit.
      </p>

      <figure className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-6 py-5">
        <blockquote className="text-lg font-medium leading-8 text-slate-900">
          “…one of the most, IF NOT THE MOST, effective educational programs for
          preparing high school and university students to enter, compete and
          prosper in the ever-changing world of global economics and business.”
        </blockquote>
        <figcaption className="mt-3 text-sm text-slate-600">
          - Boise State Foundation
        </figcaption>
      </figure>

      <section className="mt-12">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-indigo-700">
          Summit History
        </h3>
        <ol className="mt-6">
          {history.map((item) => (
            <li
              key={`${item.year}-${item.detail}`}
              className="group grid grid-cols-[4.25rem_1fr] gap-x-5"
            >
              <p className="pt-0.5 text-right text-sm font-bold text-indigo-700">
                {item.year}
              </p>
              <div className="relative border-l border-slate-200 pb-7 pl-5 group-last:pb-1">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-indigo-600 bg-white" />
                <p className="text-sm leading-6 text-slate-700">{item.detail}</p>
                {item.note ? (
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {item.note}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10">
        <h3 className="text-lg font-bold tracking-tight text-slate-900">
          Summit Achievements
        </h3>
        <ul className="mt-3 divide-y divide-slate-200 border-t border-slate-200">
          {achievements.map((item) => (
            <li key={item} className="py-3.5 text-sm leading-6 text-slate-700">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}

function PreparingForSummitDay() {
  return (
    <article className="max-w-4xl">
      <h2 className="text-3xl font-bold tracking-tight text-slate-900">
        Preparing for Summit Day
      </h2>
      <p className="mt-4 text-base leading-7 text-slate-700">
        The object of the International Economic Summit is for student teams to
        act as Economic Advisors of countries in the world in order to improve
        the standard of living for that country. During the pre-summit phase,
        student teams will select countries, organize, start researching
        problems and issues, create displays and representation models to show
        off country cultures and prepare to act as “Economic Advisors” on Summit
        Day. Team members should all understand their purpose, how each activity
        provides opportunity to help their country, and what role each member
        plays. Each action teams take to make improvements in their country’s
        economy must be tied to what other countries are doing, thus the need to
        collaborate and cooperate.
      </p>

      <h3 className="mt-10 text-xl font-bold tracking-tight text-slate-900">
        Phase 1: The Learning Phase
      </h3>
      <ol className="mt-5 space-y-3">
        {learningSteps.map((step, index) => (
          <li
            key={step.labels[0]}
            className="rounded-2xl border border-slate-200 px-5 py-4"
          >
            <div className="flex gap-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700">
                {index + 1}
              </span>
              <div>
                <p className="text-sm leading-6 text-slate-700">{step.body}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {step.labels.map((label) => (
                    <span
                      key={label}
                      className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}

export function EconSummitPage() {
  const [tab, setTab] = useState<SummitTab>("overview");

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
          <nav
            className="mt-8 flex flex-wrap gap-x-6 border-b border-slate-200"
            aria-label="Economic Summit sections"
          >
            {tabs.map(({ id, label }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition ${
                    active
                      ? "border-indigo-700 text-indigo-700"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>
          <div className="mt-8">
            {tab === "overview" && (
              <>
                <p className="max-w-4xl text-base leading-7 text-slate-700">
                  The International Economic Summit is a hands-on, global
                  learning experience where students represent countries, build
                  cultural and economic projects, and practice leadership
                  through real-world collaboration.
                </p>
                <ul className="mt-5 list-disc space-y-2 pl-5 text-sm text-slate-700 marker:text-indigo-600">
                  <li>Students build and present country-based projects.</li>
                  <li>
                    Program emphasizes economics, communication, and leadership.
                  </li>
                  <li>
                    Teams collaborate in a summit-style, real-world event
                    format.
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
              </>
            )}
            {tab === "resume" && <SummitResume />}
            {tab === "preparing" && <PreparingForSummitDay />}
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
