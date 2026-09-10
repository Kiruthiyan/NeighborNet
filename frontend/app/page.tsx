"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Radio,
  Zap,
  ShieldCheck,
  Truck,
  ClipboardList,
  HandHeart,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Users,
  Sparkles,
  MapPin,
  Heart,
  ChevronRight,
  ShieldAlert,
  Clock,
  Layers
} from "lucide-react";
import { NetworkIllustration } from "../components/NetworkIllustration";
import { useAuth } from "../lib/auth";

const roleCards = [
  {
    icon: ClipboardList,
    badge: "For Anyone",
    title: "Request Support",
    description: "Ask for food, essential supplies, or aid with zero friction. Every account can post requests instantly.",
    color: "from-emerald-500/10 to-teal-500/5 border-emerald-200 text-emerald-700",
    iconBg: "bg-emerald-600 text-white"
  },
  {
    icon: HandHeart,
    badge: "For Donors",
    title: "Share Surplus",
    description: "List extra groceries, cooked meals, or household essentials. Match with neighbors who need them most.",
    color: "from-teal-500/10 to-cyan-500/5 border-teal-200 text-teal-700",
    iconBg: "bg-teal-600 text-white"
  },
  {
    icon: Truck,
    badge: "For Helpers",
    title: "Volunteer Dispatch",
    description: "Receive real-time notifications for nearby pickup & delivery missions. Accept or pass as your schedule permits.",
    color: "from-blue-500/10 to-indigo-500/5 border-blue-200 text-blue-700",
    iconBg: "bg-blue-600 text-white"
  },
  {
    icon: ShieldCheck,
    badge: "For Leaders",
    title: "Coordinate & Direct",
    description: "Manage emergency alerts, review high-risk dispatches, and oversee zone disaster relief efforts.",
    color: "from-amber-500/10 to-orange-500/5 border-amber-200 text-amber-700",
    iconBg: "bg-amber-600 text-white"
  }
];

const steps = [
  {
    n: "01",
    title: "Post or Offer Assistance",
    description: "A neighbor requests assistance or lists surplus resources. Requirements are logged into the neighborhood pool with location and urgency.",
    icon: ClipboardList
  },
  {
    n: "02",
    title: "Autonomous Smart Routing",
    description: "NeighborNet evaluates distance, availability, and volunteer preferences to pair resources with needs in under 3 seconds.",
    icon: RefreshCw
  },
  {
    n: "03",
    title: "Safe & Verified Delivery",
    description: "Volunteers pick up items, tracking status end-to-end. If an issue arises, the network re-assigns the task automatically.",
    icon: CheckCircle2
  }
];

const stats = [
  { label: "Meals & Aid Delivered", value: "1,420+", icon: Heart, change: "+18% this month" },
  { label: "Active Volunteers", value: "380+", icon: Users, change: "In 12 local zones" },
  { label: "Avg Matching Time", value: "< 3 mins", icon: Zap, change: "Real-time dispatch" },
  { label: "Delivery Reliability", value: "99.4%", icon: ShieldCheck, change: "Self-healing network" }
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"normal" | "disaster">("normal");

  useEffect(() => {
    if (!loading && user) {
      if (user.is_coordinator || user.is_admin) {
        router.replace("/ops/dashboard");
      } else {
        router.replace("/community/dashboard");
      }
    }
  }, [loading, user, router]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 font-sans text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* Background Decor */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-emerald-200/40 via-teal-100/30 to-transparent blur-3xl" />
        <div className="absolute top-[600px] -left-40 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-blue-200/30 via-emerald-100/20 to-transparent blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md transition-all">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
              <Radio size={20} className="animate-pulse" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                NeighborNet
              </span>
              <span className="hidden sm:inline-block ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Mutual Aid
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-emerald-600 transition-colors">Features</a>
            <a href="#modes" className="hover:text-emerald-600 transition-colors">Operating Modes</a>
            <a href="#how-it-works" className="hover:text-emerald-600 transition-colors">How It Works</a>
            <a href="#roles" className="hover:text-emerald-600 transition-colors">Roles</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              href="/login"
            >
              Sign in
            </Link>
            <Link
              className="group inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/30 hover:bg-emerald-500 hover:shadow-md transition-all active:scale-[0.98]"
              href="/signup"
            >
              Get started
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 lg:pt-20 lg:pb-24">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Left Column Text */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Autonomous Community Resource Network</span>
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.15]">
              The community plan that{" "}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                repairs itself
              </span>{" "}
              when reality changes.
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-slate-600 leading-relaxed">
              NeighborNet connects neighbors in need with those ready to give—routing surplus food, essential supplies, and volunteer support with real-time adaptation when disruptions occur.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                className="group inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-600 hover:shadow-xl transition-all active:scale-[0.98]"
                href="/signup"
              >
                Join Your Community
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors"
                href="/login"
              >
                Sign In to Dashboard
              </Link>
            </div>

            {/* Micro Highlights */}
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-200/80 pt-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>100% Free & Open Access</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Self-Healing Route Dispatch</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Instant Disaster Mode</span>
              </div>
            </div>
          </div>

          {/* Right Column Illustration + Floating Cards */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto w-full max-w-lg">
              {/* Backglow */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-emerald-400/20 via-teal-300/30 to-blue-400/20 blur-2xl transform -rotate-3 scale-105" />

              {/* Main Card container */}
              <div className="relative rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Live Network Activity</span>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                    Zone #4 • Active
                  </span>
                </div>

                <div className="aspect-[4/3.2] w-full">
                  <NetworkIllustration />
                </div>

                {/* Floating Activity Badges */}
                <div className="mt-4 space-y-2.5">
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/80 p-2.5 shadow-sm text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700 font-bold">
                        🌾
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">20kg Fresh Produce Donated</div>
                        <div className="text-[11px] text-slate-500">Green Valley Pantry • 4 mins ago</div>
                      </div>
                    </div>
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">Matched</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/80 p-2.5 shadow-sm text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-7 w-7 place-items-center rounded-lg bg-blue-100 text-blue-700 font-bold">
                        🚚
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">Volunteer Delivery Claimed</div>
                        <div className="text-[11px] text-slate-500">Route #104 • ETA 15 mins</div>
                      </div>
                    </div>
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">In Transit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-slate-200/80 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Icon size={24} />
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{stat.value}</div>
                    <div className="text-xs font-bold text-slate-700">{stat.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{stat.change}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Two Operating Modes Section */}
      <section id="modes" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-200/80 px-3.5 py-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Layers size={13} />
            Dual-Mode Architecture
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Two operating modes. One unified community engine.
          </h2>
          <p className="mt-4 text-base text-slate-600">
            Normal-day food recovery and emergency disaster dispatch share the same verified volunteers, inventory, and safety rules—so no rebuild is needed when crises hit.
          </p>
        </div>

        <div className="mt-12 grid lg:grid-cols-2 gap-8">
          {/* Normal Day Card */}
          <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-b from-emerald-50/50 via-white to-white p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white uppercase tracking-wider shadow-sm">
                <Heart size={13} />
                Normal Day Operations
              </div>
              <span className="text-xs font-semibold text-emerald-800">Auto-Matching Active</span>
            </div>

            <h3 className="text-xl font-bold text-slate-900">Food Recovery & Daily Assistance</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Everyday mutual aid for surplus food, medical supplies, and local household needs.
            </p>

            <ul className="mt-6 space-y-3.5">
              <li className="flex items-start gap-3 text-sm text-slate-700">
                <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                <span><strong>Instant Matching:</strong> Low-risk requests match with nearby donors automatically without manual delay.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-700">
                <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                <span><strong>Flexible Pickup Windows:</strong> Donors specify time slots (6h, 12h, 24h) for easy volunteer collection.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-700">
                <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                <span><strong>Community Dashboard:</strong> Simple interface for anyone to ask for help or contribute excess resources.</span>
              </li>
            </ul>

            <div className="mt-8 rounded-2xl bg-white border border-emerald-100 p-4 shadow-sm">
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">Live Example</div>
              <div className="text-xs text-slate-600">"Pantry surplus of 15 loaves of fresh bread matched to Community Kitchen in 2 minutes."</div>
            </div>
          </div>

          {/* Disaster Response Card */}
          <div className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-b from-amber-50/50 via-white to-white p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-3 py-1 text-xs font-bold text-white uppercase tracking-wider shadow-sm">
                <ShieldAlert size={13} />
                Disaster Response Mode
              </div>
              <span className="text-xs font-semibold text-amber-800">Priority Routing</span>
            </div>

            <h3 className="text-xl font-bold text-slate-900">Emergency Dispatch & Re-routing</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              When extreme weather, power outages, or crises strike, NeighborNet elevates response priority instantly.
            </p>

            <ul className="mt-6 space-y-3.5">
              <li className="flex items-start gap-3 text-sm text-slate-700">
                <CheckCircle2 size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <span><strong>Live Volunteer Push Alerts:</strong> Active volunteers instantly receive push alerts for emergency tasks.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-700">
                <CheckCircle2 size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <span><strong>Coordinator Oversight:</strong> High-risk or complex emergency requests pause for instant coordinator approval.</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-700">
                <CheckCircle2 size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <span><strong>Self-Healing Re-routing:</strong> If a volunteer drops out or route is blocked, the engine instantly re-dispatches to the next closest helper.</span>
              </li>
            </ul>

            <div className="mt-8 rounded-2xl bg-white border border-amber-100 p-4 shadow-sm">
              <div className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Disaster Example</div>
              <div className="text-xs text-slate-600">"Emergency generator request in Flood Zone #2 dispatched to 5 nearby volunteers in 30 seconds."</div>
            </div>
          </div>
        </div>
      </section>

      {/* Role Capabilities Section */}
      <section id="roles" className="border-t border-slate-200/80 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Built for every neighbor, adapted for every role
            </h2>
            <p className="mt-4 text-base text-slate-600">
              Everyone signs up with a unified account. Turn on donation or volunteering capabilities whenever you are ready.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {roleCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-slate-50/50 p-6 hover:bg-white hover:shadow-xl hover:border-slate-300 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`grid h-12 w-12 place-items-center rounded-2xl ${card.iconBg} shadow-sm group-hover:scale-110 transition-transform`}>
                        <Icon size={22} />
                      </div>
                      <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                        {card.badge}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      {card.description}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-slate-200/60 pt-4 flex items-center text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform">
                    <span>Learn more</span>
                    <ChevronRight size={14} className="ml-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            How NeighborNet Coordinates Aid
          </h2>
          <p className="mt-4 text-base text-slate-600">
            From initial post to final delivery, intelligent automation ensures zero lost resources and maximum safety.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="relative rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-4xl font-black text-emerald-200">{step.n}</span>
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 font-bold">
                    <Icon size={20} />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{step.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Final Call To Action */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 mb-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 px-6 py-16 text-center text-white shadow-2xl sm:px-12 sm:py-20">
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-emerald-500 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-teal-500 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-bold text-emerald-300 uppercase tracking-wider border border-emerald-500/30">
              <Zap size={14} /> Ready in under 1 minute
            </span>

            <h2 className="mt-6 text-3xl font-extrabold sm:text-4xl lg:text-5xl text-white tracking-tight leading-tight">
              Ready to strengthen your neighborhood resilience?
            </h2>

            <p className="mt-4 text-base text-slate-300 sm:text-lg max-w-2xl mx-auto">
              Join as a recipient, donor, or volunteer today. Empower your community with self-healing mutual aid.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                className="group inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-7 py-3.5 text-base font-bold text-slate-950 shadow-lg hover:bg-emerald-400 transition-all active:scale-[0.98]"
                href="/signup"
              >
                Create Free Account
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-7 py-3.5 text-base font-bold text-white hover:bg-slate-800 transition-colors"
                href="/login"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-white">
                <Radio size={18} />
              </div>
              <div>
                <span className="text-base font-bold text-slate-900">NeighborNet</span>
                <p className="text-xs text-slate-500">Autonomous Community Resource & Disaster Relief Network</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs font-semibold text-slate-600">
              <Link href="/login" className="hover:text-emerald-600 transition-colors">Sign In</Link>
              <Link href="/signup" className="hover:text-emerald-600 transition-colors">Register</Link>
              <Link href="/community/dashboard" className="hover:text-emerald-600 transition-colors">Community Dashboard</Link>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} NeighborNet. Built for community resilience and food recovery.
          </div>
        </div>
      </footer>
    </main>
  );
}