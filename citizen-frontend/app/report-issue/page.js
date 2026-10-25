"use client";

import Link from "next/link";
import { useState } from "react";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const categories = [
  "Roads",
  "Drainage",
  "Waste Management",
  "Water",
  "Street Lighting",
  "Public Facilities",
  "Other",
];

const initialForm = {
  title: "",
  category: "Roads",
  location: "",
  description: "",
};

export default function GuestReportPage() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reportId, setReportId] = useState("");

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setReportId("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/guest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          category: form.category,
          location: form.location.trim(),
          description: form.description.trim(),
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Unable to submit your report. Please try again.");
      }

      const submittedId = result?.data?.report?.id;
      if (!submittedId) {
        throw new Error("The report was submitted, but no reference number was returned.");
      }

      setReportId(submittedId);
      setForm(initialForm);
    } catch (submitError) {
      setError(submitError.message || "Unable to submit your report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f2f7f3] px-5 py-10 text-[#173c32] sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-semibold text-[#187a58] hover:text-[#126448]"
        >
          <span aria-hidden="true">←</span> Back to MtaaFix
        </Link>

        <section className="mt-8 rounded-3xl border border-[#e0e9e2] bg-white p-6 shadow-sm sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#187a58]">
            Anonymous community report
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Report an issue
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#66776f]">
            Tell local authorities what happened and where. You do not need to
            create an account, and this form does not ask for your name or
            contact details.
          </p>

          {reportId && (
            <div
              className="mt-6 rounded-xl border border-[#b8d9c4] bg-[#edf7f0] p-4 text-sm leading-6 text-[#24583d]"
              role="status"
            >
              <p className="font-semibold">Your report was submitted.</p>
              <p className="mt-1">
                Reference number: <span className="font-mono">{reportId}</span>
              </p>
              <p className="mt-1">
                Keep this reference for your records. Because the report is
                anonymous, you cannot receive individual updates or track it
                from an account.
              </p>
            </div>
          )}

          {error && (
            <div
              className="mt-6 rounded-xl border border-[#e7c9bb] bg-[#fff4ee] p-4 text-sm leading-6 text-[#7d4435]"
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label htmlFor="guest-title" className="mb-2 block text-sm font-semibold">
                Issue title *
              </label>
              <input
                id="guest-title"
                name="title"
                required
                minLength={3}
                maxLength={150}
                value={form.title}
                onChange={updateField}
                placeholder="e.g. Pothole near the market entrance"
                className="w-full rounded-xl border border-[#cbd6cf] px-4 py-3 text-sm outline-none focus:border-[#187a58] focus:ring-2 focus:ring-[#187a58]/15"
              />
            </div>

            <div>
              <label htmlFor="guest-category" className="mb-2 block text-sm font-semibold">
                Issue category *
              </label>
              <select
                id="guest-category"
                name="category"
                value={form.category}
                onChange={updateField}
                className="w-full rounded-xl border border-[#cbd6cf] bg-white px-4 py-3 text-sm outline-none focus:border-[#187a58] focus:ring-2 focus:ring-[#187a58]/15"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="guest-location" className="mb-2 block text-sm font-semibold">
                Location *
              </label>
              <input
                id="guest-location"
                name="location"
                required
                minLength={3}
                maxLength={200}
                value={form.location}
                onChange={updateField}
                placeholder="Town, estate, road, or nearby landmark"
                className="w-full rounded-xl border border-[#cbd6cf] px-4 py-3 text-sm outline-none focus:border-[#187a58] focus:ring-2 focus:ring-[#187a58]/15"
              />
            </div>

            <div>
              <label htmlFor="guest-description" className="mb-2 block text-sm font-semibold">
                Description *
              </label>
              <textarea
                id="guest-description"
                name="description"
                required
                minLength={10}
                maxLength={5000}
                rows={6}
                value={form.description}
                onChange={updateField}
                placeholder="Describe the issue and how it affects the community."
                className="w-full resize-y rounded-xl border border-[#cbd6cf] px-4 py-3 text-sm leading-6 outline-none focus:border-[#187a58] focus:ring-2 focus:ring-[#187a58]/15"
              />
            </div>

            <p className="text-xs leading-5 text-[#66776f]">
              Submissions are anonymous and limited to help prevent abuse.
              Please do not include personal information in your description.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#187a58] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#126448] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting report..." : "Submit Anonymous Report"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#66776f]">
            Want to track reports and receive updates?{" "}
            <Link href="/create-account" className="font-semibold text-[#187a58] hover:underline">
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
