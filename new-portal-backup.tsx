
import Link from "next/link";

const workspaces = [
  {
    number: "01",
    eyebrow: "ADMINISTRATION",
    title: "Admin Dashboard",
    description:
      "Review community reports, coordinate departments, and monitor the progress of reported issues from one central workspace.",
    features: [
      "Report overview and search",
      "Department assignments",
      "Status monitoring and CSV export",
    ],
    href: "/admin",
    action: "Open Admin Dashboard",
  },
  {
    number: "02",
    eyebrow: "SERVICE DELIVERY",
    title: "Government Dashboard",
    description:
      "Manage community issues, review their locations, follow resolution progress, and explore the geographic distribution of reports.",
    features: [
      "Community report management",
      "GIS map and department information",
      "Statistics and resolution tracking",
    ],
    href: "/government",
    action: "Open Government Dashboard",
  },
];

const processSteps = [
  {
    number: "01",
    title: "Record the issue",
    description:
      "Capture the essential details, category, and reported location.",
  },
  {
    number: "02",
    title: "Assign responsibility",
    description:
      "Identify the department responsible for handling the report.",
  },
  {
    number: "03",
    title: "Track progress",
    description:
      "Monitor the report as it moves from pending to resolution.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f7f2] text-[#243329]">
      {/* Header */}
      <header className="border-b border-[#dce2d8]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-5 px-5 py-5 sm:px-8 lg:px-14">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#244637] text-sm font-bold tracking-tight text-white transition-colors group-hover:bg-[#315c47]">
              MTFX
            </div>

            <div>
              <p className="text-[15px] font-bold tracking-tight text-[#243329]">
                Mtaa Fix
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#788277]">
                Community Issue Management
              </p>
            </div>
          </Link>

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-7 text-sm text-[#59675b] md:flex"
          >
            <a
              href="#about"
              className="transition-colors hover:text-[#244637]"
            >
              About
            </a>
            <a
              href="#workspaces"
              className="transition-colors hover:text-[#244637]"
            >
              Workspaces
            </a>
            <a
              href="#process"
              className="transition-colors hover:text-[#244637]"
            >
              How it works
            </a>
          </nav>

          <Link
            href="/government"
            className="inline-flex shrink-0 items-center gap-2 border border-[#244637] px-3 py-2.5 text-xs font-semibold text-[#244637] transition-colors hover:bg-[#244637] hover:text-white sm:px-4 sm:text-sm"
          >
            Enter workspace
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section id="about" className="overflow-hidden">
        <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[1.12fr_0.88fr]">
          <div className="flex flex-col justify-center px-5 py-16 sm:px-8 sm:py-20 lg:px-14 lg:py-24">
            <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-[#55745c]">
              <span className="h-px w-8 bg-[#55745c]" />
              Community issue management
            </p>

            <h1 className="mt-7 max-w-3xl text-[42px] font-semibold leading-[1.12] tracking-[-0.045em] text-[#243329] sm:text-5xl lg:text-[62px]">
              Better follow-up.
              <span className="mt-1 block text-[#55745c]">
                Better communities.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-[#627064] sm:text-lg">
              Organize community concerns, make responsibilities clear,
              and follow the progress of local issues through a single
              reporting system.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/admin"
                className="inline-flex min-h-12 items-center justify-center gap-3 bg-[#244637] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#19372a]"
              >
                Open Admin Dashboard
                <span aria-hidden="true">→</span>
              </Link>

              <Link
                href="/government"
                className="inline-flex min-h-12 items-center justify-center border border-[#cbd4c8] bg-transparent px-5 py-3 text-sm font-semibold text-[#344b3b] transition-colors hover:border-[#244637] hover:bg-white"
              >
                Government workspace
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-[#dce2d8] pt-5 text-xs text-[#69766a] sm:text-sm">
              <span>Organized report records</span>
              <span className="text-[#9aa498]" aria-hidden="true">
                /
              </span>
              <span>Department coordination</span>
              <span className="text-[#9aa498]" aria-hidden="true">
                /
              </span>
              <span>Progress monitoring</span>
            </div>
          </div>

          {/* Workflow panel */}
          <aside className="relative flex flex-col justify-between overflow-hidden bg-[#244637] px-6 py-9 text-[#f7f7f2] sm:px-10 sm:py-12 lg:px-12 lg:py-14">
            <div
              aria-hidden="true"
              className="absolute right-0 top-0 h-40 w-40 translate-x-1/2 -translate-y-1/2 border border-white/10"
            />
            <div
              aria-hidden="true"
              className="absolute right-0 top-0 h-28 w-28 translate-x-1/2 -translate-y-1/2 border border-white/10"
            />

            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c4d3bf]">
                A clear process
              </p>

              <h2 className="mt-5 max-w-md text-3xl font-medium leading-tight tracking-tight sm:text-[38px]">
                Every report should have a next step.
              </h2>

              <p className="mt-5 max-w-md text-sm leading-7 text-[#d5dfd2]">
                A practical workflow helps staff understand what has been
                reported, who is responsible, and what still needs attention.
              </p>
            </div>

            <div className="relative mt-10">
              {processSteps.map((step, index) => (
                <div
                  key={step.number}
                  className={`grid grid-cols-[42px_1fr] gap-4 py-5 ${
                    index !== processSteps.length - 1
                      ? "border-b border-white/20"
                      : ""
                  }`}
                >
                  <span className="pt-0.5 text-sm font-medium tabular-nums text-[#b9cbb6]">
                    {step.number}
                  </span>

                  <div>
                    <h3 className="font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 max-w-sm text-sm leading-6 text-[#d5dfd2]">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="relative mt-5 border-t border-white/20 pt-5 text-xs leading-5 text-[#bdcdbd]">
              Designed to support more accountable community issue management.
            </p>
          </aside>
        </div>
      </section>

      {/* Workspaces */}
      <section
        id="workspaces"
        className="border-t border-[#dce2d8] bg-white"
      >
        <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-20 lg:px-14">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#55745c]">
                Workspaces
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#243329] sm:text-4xl">
                Designed around your role.
              </h2>
            </div>

            <p className="max-w-xl text-sm leading-7 text-[#69766a]">
              Select the workspace that matches your responsibilities.
              Each one supports a different part of the reporting process.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {workspaces.map((workspace) => (
              <article
                key={workspace.number}
                className="flex h-full flex-col border border-[#dce2d8] bg-[#fbfbf7] transition-colors hover:border-[#9caf9d]"
              >
                <div className="h-1 bg-[#244637]" />

                <div className="flex flex-1 flex-col p-6 sm:p-8">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-bold tracking-[0.16em] text-[#55745c]">
                      {workspace.eyebrow}
                    </span>
                    <span className="text-sm tabular-nums text-[#899387]">
                      {workspace.number}
                    </span>
                  </div>

                  <h3 className="mt-6 text-2xl font-semibold tracking-tight text-[#243329]">
                    {workspace.title}
                  </h3>

                  <p className="mt-4 max-w-xl text-sm leading-7 text-[#627064]">
                    {workspace.description}
                  </p>

                  <ul className="mt-6 space-y-3 border-t border-[#e1e5dd] pt-5 text-sm text-[#465448]">
                    {workspace.features.map((feature) => (
                      <li key={feature} className="flex gap-3">
                        <span
                          className="mt-1 text-[#55745c]"
                          aria-hidden="true"
                        >
                          —
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-8">
                    <Link
                      href={workspace.href}
                      className="inline-flex min-h-12 w-full items-center justify-between gap-3 bg-[#244637] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#19372a]"
                    >
                      {workspace.action}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section id="process" className="bg-[#eff1e9]">
        <div className="mx-auto grid max-w-[1440px] gap-9 px-5 py-14 sm:px-8 md:grid-cols-[0.8fr_1.2fr] md:items-start md:py-16 lg:px-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#55745c]">
              Working principles
            </p>

            <h2 className="mt-3 max-w-sm text-3xl font-semibold leading-tight tracking-tight text-[#243329]">
              Keep the work clear and accountable.
            </h2>
          </div>

          <div className="grid gap-7 sm:grid-cols-3">
            <div>
              <h3 className="font-semibold text-[#304435]">
                Clear records
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#687468]">
                Keep essential issue details together for easier review.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-[#304435]">
                Defined ownership
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#687468]">
                Make the department responsible for a report easy to identify.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-[#304435]">
                Visible progress
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#687468]">
                Follow each issue through its recorded status.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#dce2d8] bg-[#f7f7f2]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-7 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-14">
          <div>
            <p className="text-sm font-semibold text-[#344338]">
              Community Reporting System
            </p>
            <p className="mt-1 text-xs text-[#7a8378]">
              Community issue management prototype
            </p>
          </div>

          <nav aria-label="Footer navigation" className="flex flex-wrap gap-6 text-sm text-[#627064]">
            <Link href="/admin" className="hover:text-[#244637]">
              Admin
            </Link>
            <Link href="/government" className="hover:text-[#244637]">
              Government
            </Link>
            <a href="#about" className="hover:text-[#244637]">
              Back to top
            </a>
          </nav>

          <p className="text-xs text-[#7a8378]">
            Prototype · Not an official government website
          </p>
        </div>
      </footer>
    </main>
  );
}
