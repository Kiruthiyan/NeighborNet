"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Radio } from "lucide-react";
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
    <div className="w-full max-w-sm rounded border border-slate-200 bg-white p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded bg-leaf text-white">
          <Radio size={21} />
        </div>
        <div>
          <div className="text-sm font-semibold">NeighborNet</div>
          <div className="text-xs text-slate-500">Create an account</div>
        </div>
      </div>

      {inviteToken && (
        <p className="mb-4 rounded bg-field px-3 py-2 text-xs text-leaf">
          You&apos;re signing up from an admin invitation - any capabilities it grants apply
          automatically once you finish.
        </p>
      )}

      <form className="grid gap-3" onSubmit={handleSubmit}>
        <label className="grid gap-1 text-sm">
          <span className="text-slate-600">Name</span>
          <input
            autoComplete="name"
            className="rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-leaf"
            onChange={(e) => setName(e.target.value)}
            required
            type="text"
            value={name}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-slate-600">Email</span>
          <input
            autoComplete="email"
            className="rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-leaf"
            onChange={(e) => setEmail(e.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-slate-600">Password</span>
          <input
            autoComplete="new-password"
            className="rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-leaf"
            minLength={8}
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          className="mt-2 rounded bg-leaf px-3 py-2 text-sm font-medium text-white hover:bg-leaf/90 disabled:opacity-50"
          disabled={busy}
          type="submit"
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link className="font-medium text-leaf" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-mist px-4">
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
    </main>
  );
}
