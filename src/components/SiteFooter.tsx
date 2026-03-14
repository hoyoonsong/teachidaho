export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-green-900 py-8">
      <div className="flex flex-col-reverse md:flex-row">
        <div className="mx-auto max-w-7xl px-6 text-sm text-slate-600 lg:px-8">
          <p className="font-semibold text-yellow-500">Socials</p>
          <a
            href="https://www.facebook.com/TeachIdaho/"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block font-semibold text-white underline-offset-4 hover:underline"
          >
            facebook.com/TeachIdaho
          </a>
        </div>

        <div className="mx-auto max-w-7xl px-6 text-sm text-slate-600 lg:px-8">
          <p className="font-semibold text-yellow-500">Contact</p>
          <a
            href="mailto:kkurdy@teachidaho.org"
            className="mt-3 inline-block font-semibold text-white underline-offset-4 hover:underline"
          >
            kkurdy@teachidaho.org
          </a>
        </div>

        <div className="mx-auto max-w-7xl px-6 text-sm text-slate-600 lg:px-8">
          <p className="font-semibold text-yellow-500">Copyright</p>
          <p className="mt-3 text-sm text-white">
            &copy; {new Date().getFullYear()} Teach Idaho. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
