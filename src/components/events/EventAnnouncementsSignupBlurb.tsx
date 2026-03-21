import type { ReactNode } from "react";

type EventAnnouncementsSignupBlurbProps = {
  /** Primary CTA (e.g. sign in). Omit when user is already covered (e.g. auto opt-in pending). */
  primaryAction?: ReactNode;
  /** Clickable “Register” in the teachers line (button or link). */
  registerAction?: ReactNode;
};

/**
 * Shared copy for opting into event-scoped announcements (student/public path).
 */
export function EventAnnouncementsSignupBlurb({
  primaryAction,
  registerAction,
}: EventAnnouncementsSignupBlurbProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-black tracking-tight text-slate-900">
          Event announcements
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Opt in to get <strong>student</strong> and{" "}
          <strong>event-wide public</strong> posts for this event. If you
          already use a student or volunteer account, we&apos;ll turn this on as
          soon as you&apos;re signed in.{" "}
          <span className="text-slate-500">
            (Volunteers: ask your coordinator for the volunteer QR link.)
          </span>
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">
          Receive announcements
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          We&apos;ll use a <strong>student</strong> account for this event (if
          you&apos;re already signed in as a <strong>volunteer</strong>,
          that&apos;s fine too—stay signed in and we&apos;ll opt you in here).
        </p>
        {primaryAction ? <div className="mt-4">{primaryAction}</div> : null}
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600">
        <p>
          <strong className="text-slate-800">Teachers:</strong> you receive
          teacher announcements when you register for this event on the{" "}
          {registerAction ?? (
            <span className="font-semibold text-emerald-800">Register</span>
          )}{" "}
          page.
        </p>
        <p className="mt-2">
          <strong className="text-slate-800">Volunteers:</strong> coordinators
          share a separate QR link—this flow is for students and the general
          public.
        </p>
      </div>
    </div>
  );
}
