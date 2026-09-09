"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
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
      ? "Email delivery isn't configured yet, so the code is pre-filled here for testing."
      : null
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const profile = await verifyEmail(email, otp);
      setUser(profile);
      router.push("/");
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
      setNotice(result.dev_otp ? `New code (dev): ${result.dev_otp}` : "A new code was sent.");
      if (result.dev_otp) setOtp(result.dev_otp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded border border-slate-200 bg-white p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded bg-leaf text-white">
          <MailCheck size={21} />
        </div>
        <div>
          <div className="text-sm font-semibold">Verify your email</div>
          <div className="text-xs text-slate-500">{email || "Enter the code we sent you"}</div>
        </div>
      </div>

      <form className="grid gap-3" onSubmit={handleSubmit}>
        <label className="grid gap-1 text-sm">
          <span className="text-slate-600">6-digit code</span>
          <input
            autoComplete="one-time-code"
            className="rounded border border-slate-300 px-3 py-2 text-center text-lg tracking-[0.3em] outline-none focus:border-leaf"
            inputMode="numeric"
            maxLength={6}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            required
            value={otp}
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}
        {notice && <p className="text-sm text-slate-600">{notice}</p>}

        <button
          className="mt-2 rounded bg-leaf px-3 py-2 text-sm font-medium text-white hover:bg-leaf/90 disabled:opacity-50"
          disabled={busy || otp.length !== 6}
          type="submit"
        >
          {busy ? "Verifying…" : "Verify"}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <button
          className="font-medium text-leaf disabled:opacity-50"
          disabled={busy}
          onClick={handleResend}
          type="button"
        >
          Resend code
        </button>
        <Link className="text-slate-500" href="/">
          Skip for now
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-mist px-4">
      <Suspense fallback={null}>
        <VerifyEmailForm />
      </Suspense>
    </main>
  );
}
