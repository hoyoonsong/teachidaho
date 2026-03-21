import { useMemo, useState } from "react";

type AdminEventVolunteersPageProps = {
  eventId: string;
  eventName: string;
};

/**
 * QR image via public API (no extra npm deps). Requires network to render the image.
 */
function qrImageUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(data)}`;
}

export function AdminEventVolunteersPage({
  eventId,
  eventName,
}: AdminEventVolunteersPageProps) {
  const volunteerUrl = useMemo(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/participants/event/${eventId}/subscribe/volunteer`;
  }, [eventId]);

  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(volunteerUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Volunteers
        </p>
        <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">
          Volunteer announcement signup for {eventName}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Share this link or QR code with volunteers only. They’ll create or use a{" "}
          <strong>volunteer</strong> account and opt in to this event’s volunteer
          announcements. The public event page uses a separate student-oriented
          flow.
        </p>
      </div>

      <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-6 shadow-sm ring-1 ring-violet-100">
        <h3 className="text-sm font-bold text-violet-950">Volunteer link</h3>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <code className="block flex-1 break-all rounded-lg bg-white px-3 py-2 text-xs text-slate-800 ring-1 ring-violet-200/80">
            {volunteerUrl}
          </code>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="shrink-0 rounded-xl bg-violet-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-900"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">QR code</h3>
        <p className="mt-1 max-w-md text-center text-xs text-slate-500">
          Scan to open the volunteer subscribe page. Image loads from a public QR
          service; ensure you have internet when printing or displaying.
        </p>
        <img
          src={qrImageUrl(volunteerUrl)}
          width={220}
          height={220}
          alt=""
          className="mt-4 rounded-lg border border-slate-200 bg-white p-2 shadow-sm"
        />
        <p className="mt-3 text-center text-[11px] text-slate-400">
          {eventName}
        </p>
      </div>
    </div>
  );
}
