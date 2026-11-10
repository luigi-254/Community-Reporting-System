import Link from "next/link";
import Image from "next/image";
import BrandLogo from "./components/BrandLogo";
import {
  ArrowRight,
  Building2,
  CheckCircle,
  ExternalLink,
  FileText,
  MapPin,
  Bell,
} from "lucide-react";

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
    icon: <ExternalLink className="w-5 h-5" />,
  },
  {
    title: "Clear status tracking",
    description:
      "See whether your report has been submitted, reviewed, resolved, or needs follow-up.",
    icon: <CheckCircle className="w-5 h-5" />,
  },
  {
    title: "Location-aware reports",
    description:
      "Add a place or use the map-supported location tools to help officers find the issue.",
    icon: <MapPin className="w-5 h-5" />,
  },
  {
    title: "Updates and notifications",
    description:
      "Receive account and report updates through the notification features available in the system.",
    icon: <Bell className="w-5 h-5" />,
  },
  {
    title: "Tools for public officers",
    description:
      "Government officers and administrators can review reports and monitor service delivery.",
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    title: "A shared record",
    description:
      "Keep report details and progress together to support transparency and accountability.",
    icon: <FileText className="w-5 h-5" />,
  },
];

function Brand({ inverse = false }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-3 font-semibold tracking-tight ${inverse ? "text-white" : "text-[#173c32]"}`}
      aria-label="MtaaFix home"
    >
      <BrandLogo className="h-10 w-10" preload />
      <span className="text-xl">MtaaFix</span>
    </Link>
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
            <a href="#how-it-works" className="whitespace-nowrap hover:text-[#187a58]">
              How It Works
            </a>
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

      <section className="relative isolate bg-gradient-to-br from-[#eaf4ed] to-[#f4f8f5]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_30%,rgba(24,122,88,0.08),transparent_40%)]" />
        <div className="mx-auto grid max-w-[1216px] items-center gap-[52px] px-5 py-16 sm:px-8 sm:py-20 lg:px-10 lg:py-24 lg:grid-cols-[1fr_1fr]">
          <div>
            <h1 className="mt-6 max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight text-[#173c32] sm:text-5xl lg:text-6xl">
              Make Your Community Better with <span className="text-[#187a58]">MtaaFix.</span>
            </h1>
            <p className="mt-6 max-w-xl text-[#4a6159] text-[17.5px] leading-1.6">
              Report community problems, track progress, and help local
              authorities deliver better services. Your voice can make a
              difference.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/report-issue"
                className="inline-flex min-h-12 items-center justify-center rounded-[11px] bg-[#187a58] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(24,122,88,0.25)] transition hover:bg-[#126448] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#187a58]"
              >
                Report an Issue
                <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
              </Link>
              <Link
                href="/create-account"
                className="inline-flex min-h-12 items-center justify-center rounded-[11px] border border-[#d6e1db] bg-white px-6 py-3 text-sm font-semibold text-[#173c32] transition hover:border-[#187a58] hover:bg-[#f8fbf9]"
              >
                Create an Account
              </Link>
            </div>
          </div>
          <div className="grid gap-[14px] lg:grid-cols-[1fr_1fr]">
            <div className="aspect-[4/3] rounded-[20px] bg-white p-[6px] shadow-[0_16px_36px_rgba(23,60,50,0.09)]">
              <div className="relative h-full w-full rounded-[14px] overflow-hidden">
                <Image
                  src="/hero/photo-1-resident-reporting.png"
                  alt="Resident reporting a neighborhood issue on a smartphone"
                  fill
                  className="object-cover"
                  sizes="(max-width: 920px) 100vw, 50vw"
                />
              </div>
            </div>
            <div className="aspect-[4/3] rounded-[20px] bg-white p-[6px] shadow-[0_16px_36px_rgba(23,60,50,0.09)]">
              <div className="relative h-full w-full rounded-[14px] overflow-hidden">
                <Image
                  src="/hero/photo-2-municipal-crew.png"
                  alt="Municipal technicians repairing a solar streetlight"
                  fill
                  className="object-cover"
                  sizes="(max-width: 920px) 100vw, 50vw"
                />
              </div>
            </div>
            <div className="lg:grid-column-[1/-1] aspect-[16/9] rounded-[20px] bg-white p-[6px] shadow-[0_16px_36px_rgba(23,60,50,0.09)]">
              <div className="relative h-full w-full rounded-[14px] overflow-hidden">
                <Image
                  src="/hero/photo-3-thriving-street.png"
                  alt="Thriving neighborhood street with working solar streetlights"
                  fill
                  className="object-cover"
                  sizes="(max-width: 920px) 100vw, 100vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#187a58]">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              From a local concern to visible progress
            </h2>
            <p className="mt-4 leading-7 text-[#66776f]">
              MtaaFix connects community reports with the people responsible for reviewing them.
            </p>
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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#187a58]">
              Built for the whole community
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Useful tools for reporting and follow-up
            </h2>
            <p className="mt-4 leading-7 text-[#66776f]">
              A shared space for residents, government officers, and administrators to take part in the service process.
            </p>
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
              MtaaFix is a community reporting platform that helps residents share local concerns and gives public service teams a place to review, assign, and follow up on reports. It is designed to make the process easier to understand for everyone involved.
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
            Create Account <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
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
