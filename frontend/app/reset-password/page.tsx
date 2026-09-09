"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { resetPassword } from "../../lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState(searchParams.get("dev_otp") ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await resetPassword(email, otp, newPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded border border-slate-200 bg-white p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded bg-leaf text-white">
          <KeyRound size={21} />
        </div>
        <div>
          <div className="text-sm font-semibold">Reset password</div>
          <div className="text-xs text-slate-500">{email || "Enter the code we emailed you"}</div>
        </div>
      </div>

      {done ? (
        <div className="grid gap-3">
          <p className="text-sm text-slate-600">Your password has been reset.</p>
          <Link
            className="rounded bg-leaf px-3 py-2 text-center text-sm font-medium text-white hover:bg-leaf/90"
            href="/login"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <>
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
            <label className="grid gap-1 text-sm">
              <span className="text-slate-600">New password</span>
              <input
                autoComplete="new-password"
                className="rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-leaf"
                minLength={8}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                type="password"
                value={newPassword}
              />
            </label>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              className="mt-2 rounded bg-leaf px-3 py-2 text-sm font-medium text-white hover:bg-leaf/90 disabled:opacity-50"
              disabled={busy || otp.length !== 6}
              type="submit"
            >
              {busy ? "Resetting…" : "Reset password"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500">
            <Link className="font-medium text-leaf" href="/forgot-password">
              Request a new code
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-mist px-4">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
