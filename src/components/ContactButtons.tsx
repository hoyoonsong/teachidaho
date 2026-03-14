const recipients = ["hoyoon@stanford.edu", "hoyoonsong06@gmail.com"];

function mailtoLink(action: "Sponsorship" | "Volunteer" | "Partnership") {
  return `mailto:${recipients.join(",")}?subject=${encodeURIComponent(action)}`;
}

export function ContactButtons() {
  return (
    <section
      id="get-involved"
      className="border-t border-slate-200 bg-white py-12"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h3 className="text-3xl font-bold text-slate-900">Get Involved</h3>
          <p className="mt-2 text-sm text-slate-600">
            Reach out for sponsorship, volunteering, or partnership
            opportunities.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={mailtoLink("Sponsorship")}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Sponsorship
            </a>
            <a
              href={mailtoLink("Volunteer")}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-400"
            >
              Volunteer
            </a>
            <a
              href={mailtoLink("Partnership")}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-400"
            >
              Partner
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
