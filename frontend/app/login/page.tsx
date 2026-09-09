"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Radio } from "lucide-react";
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
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-mist px-4">
      <div className="w-full max-w-sm rounded border border-slate-200 bg-white p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded bg-leaf text-white">
            <Radio size={21} />
          </div>
          <div>
            <div className="text-sm font-semibold">NeighborNet</div>
            <div className="text-xs text-slate-500">Sign in</div>
          </div>
        </div>

        <form className="grid gap-3" onSubmit={handleSubmit}>
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
              autoComplete="current-password"
              className="rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-leaf"
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
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          New here?{" "}
          <Link className="font-medium text-leaf" href="/signup">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
