"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { MailCheck, ArrowRight, ShieldCheck, AlertCircle, Info } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { resendVerification, verifyEmail } from "../../lib/api";

function VerifyEmailForm() {
  const { setUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState(searchParams.get("dev_otp") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    searchParams.get("dev_otp")
      ? "Code pre-filled below from dev mode."
      : null
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const profile = await verifyEmail(email, otp);
      setUser(profile);
      router.push("/community/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await resendVerification(email);
      setNotice(result.dev_otp ? `New code: ${result.dev_otp}` : "A new code was sent.");
      if (result.dev_otp) setOtp(result.dev_otp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
          <MailCheck size={22} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Verify your email</h1>
          <p className="text-xs text-slate-500 font-medium truncate max-w-[240px]">{email || "Check your inbox for 6-digit code"}</p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 text-center">
            Enter 6-Digit Code
          </label>
          <input
            autoComplete="one-time-code"
            className="w-full rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/40 py-3.5 text-center text-2xl font-mono font-bold tracking-[0.4em] text-slate-900 shadow-inner outline-none focus:border-emerald-600 focus:bg-white transition-all"
            inputMode="numeric"
            maxLength={6}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            required
            value={otp}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-medium text-rose-700">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-medium text-emerald-800">
            <Info size={15} className="shrink-0 text-emerald-600 mt-0.5" />
            <span>{notice}</span>
          </div>
        )}

        <button
          className="group w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 py-3.5 px-4 text-sm font-bold text-white shadow-md hover:from-emerald-500 hover:to-teal-600 transition-all disabled:opacity-50 active:scale-[0.98]"
          disabled={busy || otp.length !== 6}
          type="submit"
        >
          {busy ? (
            <span>Verifying...</span>
          ) : (
            <>
              <span>Verify & Continue to Dashboard</span>
              <ArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5 text-xs">
        <button
          className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-50"
          disabled={busy}
          onClick={handleResend}
          type="button"
        >
          Resend code
        </button>
        <Link className="font-semibold text-slate-500 hover:text-slate-800 transition-colors" href="/community/dashboard">
          Skip to dashboard →
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 font-sans text-slate-900">
      <Suspense fallback={null}>
        <VerifyEmailForm />
      </Suspense>
    </main>
  );
}