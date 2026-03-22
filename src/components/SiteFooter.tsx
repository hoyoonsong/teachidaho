export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-green-900 py-10 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-10 px-5 sm:px-8 md:flex-row md:items-start md:justify-between md:gap-8">
        <div className="flex w-full max-w-sm flex-col items-center text-center md:max-w-none md:items-start md:text-left">
          <p className="text-sm font-semibold uppercase tracking-wide text-yellow-400">
            Socials
          </p>
          <a
            href="https://www.facebook.com/TeachIdaho/"
            target="_blank"
            rel="noreferrer"
            className="mt-3 text-sm font-semibold text-white underline-offset-4 transition hover:text-yellow-100 hover:underline"
          >
            facebook.com/TeachIdaho
          </a>
        </div>

        <div className="flex w-full max-w-sm flex-col items-center text-center md:max-w-none md:items-start md:text-left">
          <p className="text-sm font-semibold uppercase tracking-wide text-yellow-400">
            Contact
          </p>
          <a
            href="mailto:kkurdy@teachidaho.org"
            className="mt-3 text-sm font-semibold text-white underline-offset-4 transition hover:text-yellow-100 hover:underline"
          >
            kkurdy@teachidaho.org
          </a>
        </div>

        <div className="flex w-full max-w-sm flex-col items-center text-center md:max-w-none md:items-start md:text-left">
          <p className="text-sm font-semibold uppercase tracking-wide text-yellow-400">
            Copyright
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/95">
            &copy; {new Date().getFullYear()} Teach Idaho. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
