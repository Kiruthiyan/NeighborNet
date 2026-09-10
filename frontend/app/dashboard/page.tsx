"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";

export default function DashboardRedirectPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (user.is_coordinator || user.is_admin) {
        router.replace("/ops/dashboard");
      } else {
        router.replace("/community/dashboard");
      }
    }
  }, [loading, user, router]);

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-500 text-sm font-sans">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        <span>Redirecting to your portal...</span>
      </div>
    </div>
  );
}
