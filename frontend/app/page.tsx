"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  ClipboardList,
  HandHeart,
  Radio,
  ShieldCheck,
  Truck,
  Zap
} from "lucide-react";
import { NetworkIllustration } from "../components/NetworkIllustration";
import { useAuth } from "../lib/auth";

const roleCards = [
  {
    icon: ClipboardList,
    title: "Request help",
    description: "Every account can ask for food, supplies, or support - no approval needed to start.",
    tone: "text-leaf"
  },
  {
    icon: HandHeart,
    title: "Donate",
    description: "Flip on Donor from your dashboard to list surplus meals, produce, or pantry items.",
    tone: "text-leaf"
  },
  {
    icon: Truck,
    title: "Volunteer",
    description: "Flip on Volunteer to get alerted for nearby deliveries and disaster-response tasks.",
    tone: "text-flood"
  },
  {
    icon: ShieldCheck,
    title: "Coordinate",
    description: "Coordinators review risky decisions and dispatch disaster response - granted by an admin.",
    tone: "text-flood"
  }
];

const steps = [
  {
    n: "01",
    title: "Create your account",
    description: "Sign up with just an email and password. You start as a recipient, always able to ask for help."
  },
  {
    n: "02",
    title: "Choose how else you help",
    description: "Opt in to donate or volunteer any time, straight from your dashboard - or get invited in as a coordinator."
  },
  {
    n: "03",
    title: "The network does the routing",
    description: "Requests, donations, and volunteers get matched automatically - and re-routed the moment something changes."
  }
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-mist text-ink">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-mist/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded bg-leaf text-white">
              <Radio size={18} />
            </div>
            <div className="text-sm font-semibold">NeighborNet</div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              className="rounded px-3 py-2 text-sm font-medium text-ink hover:bg-slate-100"
              href="/login"
            >
              Sign in
            </Link>
            <Link
              className="rounded bg-leaf px-3 py-2 text-sm font-medium text-white hover:bg-leaf/90"
              href="/signup"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-leaf/30 bg-field px-3 py-1 text-xs font-semibold uppercase tracking-wide text-leaf">
            <Zap size={12} />
            One network, normal days and disasters alike
          </span>
          <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            The community plan that repairs itself when reality changes.
          </h1>
          <p className="mt-5 max-w-xl text-base text-slate-600 sm:text-lg">
            NeighborNet connects neighbors who need help with the neighbors who can give it - food,
            supplies, and volunteer time - and automatically re-routes the plan the moment a
            delivery falls through or a disaster hits.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              className="rounded bg-leaf px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-leaf/90"
              href="/signup"
            >
              Create free account
            </Link>
            <Link
              className="rounded border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-ink hover:bg-slate-50"
              href="/login"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            No credit card. Every account starts as a recipient - opt into donating or volunteering
            whenever you're ready.
          </p>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-md">
          <div className="absolute inset-6 rounded-full bg-field/70 blur-2xl" aria-hidden="true" />
          <div className="relative h-full w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <NetworkIllustration />
          </div>
        </div>
      </section>

      {/* Two modes, one platform */}
      <section className="border-y border-slate-200 bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">
            Two modes. The same neighbors.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-600 sm:text-base">
            Normal-day food recovery and disaster volunteer dispatch share the same resources,
            people, and safety rules - so nothing has to be rebuilt when things go wrong.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <div className="rounded-lg border border-leaf/25 bg-field/60 p-6">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-leaf">
                Normal day
              </div>
              <ul className="grid gap-2 text-sm text-slate-700">
                <li>Surplus food and supplies get matched to nearby requests.</li>
                <li>Volunteers pick up flexible delivery windows near them.</li>
                <li>Low-risk matches happen automatically, no waiting on a human.</li>
              </ul>
            </div>
            <div className="rounded-lg border border-flood/25 bg-white p-6">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-flood/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-flood">
                Disaster response
              </div>
              <ul className="grid gap-2 text-sm text-slate-700">
                <li>Nearby verified volunteers are alerted the moment a need is logged.</li>
                <li>Risky or uncertain actions pause for a coordinator's approval.</li>
                <li>A blocked route or a cancellation triggers an automatic re-plan.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <h2 className="text-center text-2xl font-semibold sm:text-3xl">Everyone starts the same way</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-600 sm:text-base">
          One account, capabilities you turn on yourself - except coordinator, which an admin grants.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {roleCards.map(({ icon: Icon, title, description, tone }) => (
            <div className="rounded-lg border border-slate-200 bg-white p-5" key={title}>
              <Icon className={tone} size={22} />
              <div className="mt-3 text-sm font-semibold">{title}</div>
              <p className="mt-1 text-sm text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-200 bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">How it works</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.n}>
                <div className="text-3xl font-semibold text-leaf/30">{step.n}</div>
                <div className="mt-2 text-base font-semibold">{step.title}</div>
                <p className="mt-1 text-sm text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-leaf py-14 text-white sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-semibold sm:text-3xl">Ready to strengthen your neighborhood?</h2>
          <p className="mt-3 text-sm text-white/85 sm:text-base">
            Join as a recipient, donor, or volunteer in under a minute.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              className="rounded bg-white px-5 py-3 text-sm font-semibold text-leaf hover:bg-white/90"
              href="/signup"
            >
              Create free account
            </Link>
            <Link
              className="rounded border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              href="/login"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center text-xs text-slate-500 sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded bg-leaf text-white">
              <Radio size={12} />
            </div>
            <span className="font-medium text-slate-600">NeighborNet</span>
          </div>
          <span>Autonomous community resource coordination.</span>
        </div>
      </footer>
    </main>
  );
}
