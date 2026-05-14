"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GuidelinesPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto flex w-full max-w-prose flex-col gap-12 px-6 pb-24 pt-20">
        {/* Hero */}
        <section className="space-y-3">
          <h1 className="text-5xl font-bold tracking-tight text-zinc-900">
            What belongs on Garden
          </h1>
          <p className="text-xl text-zinc-600 leading-relaxed">
            Garden is an open catalog. If you built something useful, even rough or unfinished, it probably belongs here.
          </p>
        </section>

        {/* Posts: Tools & Resources */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-zinc-900">Posts: tools, scripts & resources</h2>
          <p className="text-base text-zinc-600 leading-relaxed">
            Share anything useful you built: scripts, automations, dashboards, apps, templates, formulas. Even rough or unfinished work—just set expectations with the maturity level. A 10-line script that saves time is as valuable as a full app.
          </p>
        </section>

        {/* Threads: Questions & Discussion */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-zinc-900">Threads: questions & discussion</h2>
          <p className="text-base text-zinc-600 leading-relaxed">
            Use threads to ask for help, troubleshoot problems, share feedback, or discuss ideas. Keep support requests and questions in threads so tool posts stay focused on shareable resources.
          </p>
        </section>

        {/* What to leave out */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-zinc-900">What to leave out</h2>
          <ul className="list-disc list-inside space-y-2 text-base text-zinc-600">
            <li>Credentials, API keys, or passwords (even test ones)</li>
            <li>Personal or customer data</li>
            <li>Anything marked confidential or restricted</li>
            <li>Unreleased plans not yet shared internally</li>
          </ul>
          <div className="border-l-4 border-zinc-300 pl-6 space-y-2 mt-4">
            <p className="text-xl font-medium text-zinc-800 leading-snug">
              If you wouldn&apos;t share it in a public Teams channel, you probably shouldn&apos;t share it here.
            </p>
            <p className="text-base text-zinc-500 leading-relaxed">
              Garden is internal, but treat it like any shared, searchable workspace visible to colleagues across the org.
            </p>
          </div>
          <p className="text-base text-zinc-600">
            When in doubt, check with your manager before posting.
          </p>
        </section>

        {/* CTA */}
        <section className="flex flex-col items-center gap-4 pt-4 text-center">
          <h3 className="text-xl font-semibold text-zinc-900">Ready to share something?</h3>
          <Button size="lg" asChild className="mt-1">
            <Link href="/submit">Register a tool</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
