"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Radio, Mail, Lock, ArrowRight, ShieldCheck, CheckCircle2, Zap, AlertCircle, Sparkles } from "lucide-react";
import { useAuth } from "../../lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const loggedUser = await login(email, password);
      if (loggedUser?.is_coordinator || loggedUser?.is_admin) {
        router.push("/ops/dashboard");
      } else {
        router.push("/community/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-12 bg-slate-50 font-sans text-slate-900">
      {/* Left Column: Visual & Branding Showcase (hidden on small mobile, visible lg+) */}
      <div className="relative hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-12 text-white">
        {/* Ambient Glow Effects */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-teal-500/15 blur-3xl" />
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
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 backdrop-blur-md">
            <Sparkles size={14} />
            Welcome Back to Your Local Network
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white leading-tight sm:text-5xl">
            Coordinating community support,{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              one neighbor at a time.
            </span>
          </h1>

          <p className="mt-4 text-base text-slate-300 leading-relaxed">
            Sign in to manage your donation offers, check volunteer dispatches, or submit help requests for your zone.
          </p>

          {/* Feature Highlights */}
          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 size={15} />
              </div>
              <span>Real-time surplus food matching</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
                <Zap size={15} />
              </div>
              <span>Disaster emergency response dispatch</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500/20 text-emerald-400">
                <ShieldCheck size={15} />
              </div>
              <span>Self-healing delivery re-routing</span>
            </div>
          </div>
        </div>

        {/* Footer info chip */}
        <div className="relative z-10 flex items-center justify-between border-t border-slate-800/80 pt-6 text-xs text-slate-400">
          <span>Active in 12 Neighborhood Zones</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Network Operational
          </span>
        </div>
      </div>

      {/* Right Column: Sign In Form */}
      <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-center px-6 py-12 lg:px-16">
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

          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight sm:text-3xl">Sign in to account</h2>
            <p className="mt-2 text-sm text-slate-600">
              Enter your registered email and password to access your dashboard.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
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
                  placeholder="you@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <Link className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors" href="/forgot-password">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="••••••••"
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
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign in to Dashboard</span>
                  <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-200/80 pt-6 text-center text-sm text-slate-600">
            Don't have an account yet?{" "}
            <Link className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors" href="/signup">
              Create a free account
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}