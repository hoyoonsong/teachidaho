const demoEventOptions = [
  "International Economic Summit 2026",
  "Idaho HS Entrepreneurs Challenge 2026",
];

export function ParticipantsRegisterPage() {
  const params = new URLSearchParams(window.location.search);
  const hasTeacherAccess = params.get("preview") === "teacher";

  return (
    <main>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-[min(94vw,1500px)] px-6 py-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
            Participants
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
            Registration
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-slate-700">
            This page is a UI scaffold for teacher-only registration. We will
            connect login validation and Supabase submission logic next.
          </p>
        </div>
      </section>

      <section className="bg-slate-50 py-10">
        <div className="mx-auto w-[min(94vw,1500px)] px-6">
          {!hasTeacherAccess && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-2xl font-bold tracking-tight text-amber-900">
                Teacher access required
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-amber-900/90">
                The register page is restricted to authenticated teacher
                accounts. Use the Participants page teacher-login preview button
                for now until full authentication is wired.
              </p>
              <a
                href="/participants"
                className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Back to Participants
              </a>
            </div>
          )}

          {hasTeacherAccess && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-[clamp(2rem,2.8vw,2.4rem)] font-bold tracking-tight text-slate-900">
                Registration Form Preview
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Placeholder fields only. No database writes yet.
              </p>
              <form className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  School Name
                  <input
                    type="text"
                    placeholder="Boise High School"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Teacher Name
                  <input
                    type="text"
                    placeholder="Jordan Smith"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Teacher Email
                  <input
                    type="email"
                    placeholder="teacher@school.org"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Event
                  <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    {demoEventOptions.map((eventName) => (
                      <option key={eventName}>{eventName}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Number of Students
                  <input
                    type="number"
                    min={1}
                    placeholder="25"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Grade Level
                  <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option>9th</option>
                    <option>10th</option>
                    <option>11th</option>
                    <option>12th</option>
                    <option>Mixed</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700 md:col-span-2">
                  Notes
                  <textarea
                    rows={4}
                    placeholder="Share team goals, scheduling notes, and support needed."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <div className="md:col-span-2">
                  <button
                    type="button"
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    Submit Registration (UI Preview)
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
