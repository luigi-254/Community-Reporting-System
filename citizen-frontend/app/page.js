import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Report a problem",
    description:
      "Tell your local authority about potholes, drainage, streetlights, waste collection, and other community issues.",
  },
  {
    number: "02",
    title: "Track progress",
    description:
      "Sign in any time to follow the status and updates for the reports you have submitted.",
  },
  {
    number: "03",
    title: "Get solutions",
    description:
      "Responsible officers review reports, coordinate departments, and share resolution updates.",
  },
];

const features = [
  {
    title: "Simple issue reporting",
    description:
      "Describe the issue, add a location, and attach photos when they help explain the problem.",
    icon: "↗",
  },
  {
    title: "Clear status tracking",
    description:
      "See whether your report has been submitted, reviewed, resolved, or needs follow-up.",
    icon: "✓",
  },
  {
    title: "Location-aware reports",
    description:
      "Add a place or use the map-supported location tools to help officers find the issue.",
    icon: "⌖",
  },
  {
    title: "Updates and notifications",
    description:
      "Receive account and report updates through the notification features available in the system.",
    icon: "•",
  },
  {
    title: "Tools for public officers",
    description:
      "Government officers and administrators can review reports and monitor service delivery.",
    icon: "▤",
  },
  {
    title: "A shared record",
    description:
      "Keep report details and progress together to support transparency and accountability.",
    icon: "◷",
  },
];

function Brand({ inverse = false }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-3 font-semibold tracking-tight ${
        inverse ? "text-white" : "text-[#173c32]"
      }`}
      aria-label="MtaaFix home"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#187a58] text-lg font-bold text-white">
        M
      </span>
      <span className="text-xl">MtaaFix</span>
    </Link>
  );
}

function CommunityIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-xl" aria-hidden="true">
      <div className="absolute -right-3 top-8 h-40 w-40 rounded-full bg-[#a6d8be]/50 blur-2xl sm:right-3" />
      <div className="relative rounded-[2rem] border border-white/70 bg-white p-4 shadow-[0_28px_80px_-35px_rgba(13,48,37,0.5)] sm:p-6">
        <div className="flex items-center justify-between border-b border-[#e7eee9] pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e5f3eb] text-lg text-[#187a58]">
              M
            </span>
            <div>
              <p className="text-sm font-semibold text-[#173c32]">
                Community reports
              </p>
              <p className="text-xs text-[#66776f]">A clearer path to action</p>
            </div>
          </div>
          <span className="rounded-full bg-[#e5f3eb] px-3 py-1 text-xs font-semibold text-[#187a58]">
            Live updates
          </span>
        </div>

        <div className="relative mt-5 overflow-hidden rounded-2xl bg-[#e9f1ec]">
          <svg
            viewBox="0 0 560 300"
            className="h-56 w-full sm:h-64"
            fill="none"
            role="presentation"
          >
            <path d="M0 45 170 0l110 40 120-23 160 52v231H0V45Z" fill="#E4EEE7" />
            <path d="m-8 95 575 110M53-12l177 330M306-20 181 315m236-345 48 360" stroke="#fff" strokeWidth="20" />
            <path d="M0 244c96-67 151-58 216-21s118 37 179-3 102-54 165-16v96H0v-56Z" fill="#CDE6D6" />
            <path d="M285 127c0 44-54 101-54 101s-54-57-54-101a54 54 0 1 1 108 0Z" fill="#187A58" />
            <circle cx="231" cy="126" r="17" fill="white" />
            <circle cx="405" cy="187" r="11" fill="#3D8FC2" />
            <circle cx="405" cy="187" r="21" stroke="#3D8FC2" strokeOpacity=".25" strokeWidth="8" />
            <rect x="326" y="53" width="129" height="43" rx="12" fill="white" />
            <circle cx="346" cy="74" r="7" fill="#3D8FC2" />
            <path d="M362 70h72M362 78h48" stroke="#B5C5BC" strokeLinecap="round" strokeWidth="5" />
          </svg>
          <div className="absolute bottom-4 left-4 rounded-xl bg-white px-4 py-3 shadow-lg">
            <p className="text-xs font-medium text-[#66776f]">Report status</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#173c32]">
              <span className="h-2 w-2 rounded-full bg-[#187a58]" />
              Under review
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center sm:gap-4">
          {[
            ["Report", "Share an issue"],
            ["Follow", "See progress"],
            ["Improve", "Support action"],
          ].map(([title, caption]) => (
            <div key={title} className="rounded-xl bg-[#f5f8f5] px-2 py-3">
              <p className="text-sm font-semibold text-[#173c32]">{title}</p>
              <p className="mt-1 text-[11px] text-[#66776f] sm:text-xs">{caption}</p>
            </div>
          ))}
        </div>
      </div>
      <span className="absolute -bottom-5 -left-2 hidden rounded-2xl border border-[#dbe8df] bg-white px-4 py-3 text-sm font-medium text-[#31584b] shadow-lg sm:block">
        Your voice matters in every neighborhood.
      </span>
    </div>
  );
}

export default function HomePage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();

  return (
    <main className="overflow-hidden bg-white text-[#173c32]">
      <header className="sticky top-0 z-30 border-b border-[#e8eee9] bg-white/95 backdrop-blur">
        <nav
          className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 sm:px-8"
          aria-label="Main navigation"
        >
          <Brand />
          <div className="order-3 flex w-full items-center gap-5 overflow-x-auto pb-1 text-sm font-medium text-[#53675d] md:order-2 md:w-auto md:pb-0">
            <Link href="/" className="text-[#187a58]">Home</Link>
            <a href="#how-it-works" className="whitespace-nowrap hover:text-[#187a58]">How It Works</a>
            <a href="#features" className="hover:text-[#187a58]">Features</a>
            <a href="#about" className="hover:text-[#187a58]">About Us</a>
            <a href="#contact" className="hover:text-[#187a58]">Contact</a>
          </div>
          <div className="order-2 flex items-center gap-2 md:order-3">
            <Link
              href="/sign-in"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-[#31584b] hover:bg-[#f1f6f2]"
            >
              Sign In
            </Link>
            <Link
              href="/create-account"
              className="rounded-lg bg-[#187a58] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#126448] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#187a58]"
            >
              Create Account
            </Link>
          </div>
        </nav>
      </header>

      <section className="relative isolate bg-[#f2f7f3]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_30%,rgba(196,230,207,0.45),transparent_35%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#cfe2d5] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#187a58]">
              Community reporting, made easier
            </p>
            <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight text-[#173c32] sm:text-5xl lg:text-6xl">
              Make Your Community Better with <span className="text-[#187a58]">MtaaFix.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#53675d] sm:text-lg">
              Report community problems, track progress, and help local
              authorities deliver better services. Your voice can make a
              difference.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/report-issue"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#187a58] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#126448] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#187a58]"
              >
                Report an Issue
                <span className="ml-2" aria-hidden="true">→</span>
              </Link>
              <Link
                href="/create-account"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#c8d9cf] bg-white px-6 py-3 text-sm font-semibold text-[#31584b] transition hover:border-[#187a58] hover:bg-[#f8fbf9]"
              >
                Create an Account
              </Link>
            </div>
            <p className="mt-3 text-sm text-[#53675d]">
              No account needed to submit an anonymous report.
            </p>
            <div className="mt-8 flex items-center gap-3 text-sm text-[#53675d]">
              <span className="flex -space-x-2" aria-hidden="true">
                <span className="h-8 w-8 rounded-full border-2 border-[#f2f7f3] bg-[#b8d7c3]" />
                <span className="h-8 w-8 rounded-full border-2 border-[#f2f7f3] bg-[#8bb9a0]" />
                <span className="h-8 w-8 rounded-full border-2 border-[#f2f7f3] bg-[#d3e7d8]" />
              </span>
              <span>For residents and the teams serving them</span>
            </div>
          </div>
          <CommunityIllustration />
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#187a58]">How it works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">From a local concern to visible progress</h2>
            <p className="mt-4 leading-7 text-[#66776f]">MtaaFix connects community reports with the people responsible for reviewing them.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.number} className="rounded-2xl border border-[#e3ebe5] bg-white p-7 shadow-[0_14px_35px_-30px_rgba(23,60,50,0.4)]">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e6f3eb] text-sm font-bold text-[#187a58]">{step.number}</span>
                <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#66776f]">{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-24 bg-[#f5f8f5] px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#187a58]">Built for the whole community</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Useful tools for reporting and follow-up</h2>
            <p className="mt-4 leading-7 text-[#66776f]">A shared space for residents, government officers, and administrators to take part in the service process.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-2xl border border-[#e2ebe4] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e6f3eb] text-xl font-semibold text-[#187a58]" aria-hidden="true">{feature.icon}</span>
                <h3 className="mt-5 font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#66776f]">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 rounded-[2rem] bg-[#173c32] p-8 text-white sm:p-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a9d4ba]">About MtaaFix</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Better services start with listening.</h2>
          </div>
          <div>
            <p className="text-base leading-8 text-[#d5e3da]">
              MtaaFix is a community reporting platform that helps residents
              share local concerns and gives public service teams a place to
              review, assign, and follow up on reports. It is designed to make
              the process easier to understand for everyone involved.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 sm:pb-24">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 rounded-3xl border border-[#d9e9de] bg-[#eaf5ee] p-8 sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Your neighborhood. Your voice. Let&apos;s get started.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#53675d]">Create an account to submit a community report and follow its progress.</p>
          </div>
          <Link href="/create-account" className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-[#187a58] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#126448]">
            Create Account <span className="ml-2" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <footer id="contact" className="scroll-mt-24 border-t border-[#e3ebe5] bg-white px-5 py-12 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Brand />
            <p className="mt-4 max-w-sm text-sm leading-6 text-[#66776f]">A clearer way to report local issues and follow the response.</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Explore</h2>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[#66776f]">
              <a href="#how-it-works" className="hover:text-[#187a58]">How It Works</a>
              <a href="#features" className="hover:text-[#187a58]">Features</a>
              <a href="#about" className="hover:text-[#187a58]">About Us</a>
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Account &amp; contact</h2>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[#66776f]">
              <Link href="/sign-in" className="hover:text-[#187a58]">Sign In</Link>
              <Link href="/create-account" className="hover:text-[#187a58]">Create Account</Link>
              {supportEmail ? (
                <a href={`mailto:${supportEmail}`} className="break-all hover:text-[#187a58]">{supportEmail}</a>
              ) : (
                <p>For service follow-up, use the contact details shared by your local authority.</p>
              )}
            </div>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-[#e8eee9] pt-6 text-xs text-[#66776f]">
          © MtaaFix. Community reporting and service follow-up.
        </div>
      </footer>
    </main>
  );
}
