"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { KeyRound, Mail, ArrowRight, Radio, AlertCircle } from "lucide-react";
import { forgotPassword } from "../../lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await forgotPassword(email);
      const params = new URLSearchParams({ email });
      if (result.dev_otp) params.set("dev_otp", result.dev_otp);
      router.push(`/reset-password?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 font-sans text-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
            <KeyRound size={22} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Forgot password?</h1>
            <p className="text-xs text-slate-500 font-medium">We'll email you a secure verification code</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Account Email
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

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-medium text-rose-700">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <button
            className="group w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 py-3.5 px-4 text-sm font-bold text-white shadow-md hover:from-emerald-500 hover:to-teal-600 transition-all disabled:opacity-50 active:scale-[0.98]"
            disabled={busy}
            type="submit"
          >
            {busy ? (
              <span>Sending code...</span>
            ) : (
              <>
                <span>Send Reset Code</span>
                <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm">
          <Link className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors" href="/login">
            ← Return to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}