"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Radio, User, Mail, Lock, ArrowRight, CheckCircle2, ShieldCheck, HeartHandshake, Sparkles, AlertCircle, Ticket } from "lucide-react";
import { useAuth } from "../../lib/auth";

function SignupForm() {
  const { signup } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite") ?? undefined;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const devOtp = await signup(name, email, password, inviteToken);
      const params = new URLSearchParams({ email });
      if (devOtp) params.set("dev_otp", devOtp);
      router.push(`/verify-email?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Mobile Logo */}
      <div className="lg:hidden mb-8 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white">
          <Radio size={20} />
        </div>
        <div>
          <span className="text-lg font-bold text-slate-900">NeighborNet</span>
          <div className="text-xs text-slate-500">Mutual Aid Network</div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight sm:text-3xl">Create free account</h2>
        <p className="mt-2 text-sm text-slate-600">
          Join your local mutual aid network. Every account starts with full ability to request help or share resources.
        </p>
      </div>

      {inviteToken && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900">
          <Ticket size={18} className="shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-bold">Admin Invitation Active</span>
            <p className="mt-0.5 text-amber-800">
              You are signing up via a coordinator invitation token. Specialized administrative roles will unlock automatically upon email verification.
            </p>
          </div>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Full Name
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <User size={18} />
            </div>
            <input
              autoComplete="name"
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              placeholder="Alex Morgan"
              onChange={(e) => setName(e.target.value)}
              required
              type="text"
              value={name}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Email address
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Mail size={18} />
            </div>
            <input
              autoComplete="email"
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              placeholder="alex@example.com"
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              value={email}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Password (min 8 chars)
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Lock size={18} />
            </div>
            <input
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              placeholder="••••••••"
              minLength={8}
              onChange={(e) => setPassword(e.target.value)}
              required
              type="password"
              value={password}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-medium text-rose-700">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <button
          className="group w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 py-3.5 px-4 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-600 hover:shadow-lg transition-all disabled:opacity-50 active:scale-[0.98]"
          disabled={busy}
          type="submit"
        >
          {busy ? (
            <span>Creating account...</span>
          ) : (
            <>
              <span>Create Free Account</span>
              <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-200/80 pt-5 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors" href="/login">
          Sign in instead
        </Link>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <main className="min-h-screen grid lg:grid-cols-12 bg-slate-50 font-sans text-slate-900">
      {/* Left Column: Visual & Branding Showcase */}
      <div className="relative hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 p-12 text-white">
        {/* Ambient Glow Effects */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-teal-500/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
        </div>

        {/* Brand Header */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform">
              <Radio size={22} className="animate-pulse" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                NeighborNet
              </span>
              <div className="text-xs text-slate-400 font-medium">Autonomous Mutual Aid Network</div>
            </div>
          </Link>
        </div>

        {/* Hero Visual Showcase */}
        <div className="relative z-10 my-auto max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3.5 py-1.5 text-xs font-semibold text-teal-300 backdrop-blur-md">
            <Sparkles size={14} />
            Join Over 380+ Local Volunteers & Donors
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white leading-tight sm:text-5xl">
            Start helping your neighborhood{" "}
            <span className="bg-gradient-to-r from-teal-300 via-emerald-400 to-cyan-300 bg-clip-text text-transparent">
              in under 60 seconds.
            </span>
          </h1>

          <p className="mt-4 text-base text-slate-300 leading-relaxed">
            Create a single account to request emergency supplies, list surplus groceries, or opt in to receive volunteer delivery alerts in your area.
          </p>

          {/* Role Badges Box */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">01. Recipient</div>
              <div className="text-sm font-semibold text-white mt-1">Request Aid</div>
              <div className="text-xs text-slate-400 mt-0.5">Food, supplies & medical support</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="text-xs font-bold text-teal-400 uppercase tracking-wider">02. Donor</div>
              <div className="text-sm font-semibold text-white mt-1">Share Surplus</div>
              <div className="text-xs text-slate-400 mt-0.5">Extra produce or meals</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">03. Volunteer</div>
              <div className="text-sm font-semibold text-white mt-1">Deliver Aid</div>
              <div className="text-xs text-slate-400 mt-0.5">Accept route missions near you</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">04. Coordinator</div>
              <div className="text-sm font-semibold text-white mt-1">Manage Disaster</div>
              <div className="text-xs text-slate-400 mt-0.5">Admin-invited zone leadership</div>
            </div>
          </div>
        </div>

        {/* Footer info chip */}
        <div className="relative z-10 flex items-center justify-between border-t border-slate-800/80 pt-6 text-xs text-slate-400">
          <span>Zero Platform Fees • 100% Community Driven</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" /> Instant Setup
          </span>
        </div>
      </div>

      {/* Right Column: Signup Form */}
      <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-center px-6 py-12 lg:px-16">
        <Suspense fallback={<div className="text-slate-500 text-sm">Loading form...</div>}>
          <SignupForm />
        </Suspense>
      </div>
    </main>
  );
}