import Link from "next/link";
import BrandLogo from "./BrandLogo";

export default function AuthShell({ children, eyebrow, title, description }) {
  return (
    <main className="min-h-screen bg-[#f2f7f3] px-5 py-8 text-[#173c32] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-3 font-semibold">
          <BrandLogo className="h-10 w-10" preload />
          <span className="text-xl">MtaaFix</span>
        </Link>
        <div className="mx-auto mt-10 grid max-w-5xl overflow-hidden rounded-3xl border border-[#e1ebe4] bg-white shadow-[0_28px_90px_-50px_rgba(23,60,50,0.45)] lg:grid-cols-[0.85fr_1.15fr]">
          <section className="hidden bg-[#173c32] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a9d4ba]">
                Community services
              </p>
              <h1 className="mt-5 text-4xl font-bold leading-tight">
                Your community. Your voice. Clear follow-up.
              </h1>
              <p className="mt-5 text-sm leading-7 text-[#d5e3da]">
                Report local issues, keep track of your submissions, and
                connect with the teams responsible for responding.
              </p>
            </div>
            <p className="border-t border-white/15 pt-5 text-xs text-[#bfd2c5]">
              MtaaFix · Community reporting and service follow-up
            </p>
          </section>
          <section className="p-6 sm:p-10 lg:p-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#187a58]">
              {eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-[#66776f]">
              {description}
            </p>
            <div className="mt-8">{children}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
