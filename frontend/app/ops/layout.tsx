"use client";

import { useAuth } from "../../lib/auth";
import OpsShell from "../../components/OpsShell";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const isAllowed = !!user && (user.is_coordinator || user.is_admin);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (!isAllowed) {
        router.replace("/community/dashboard");
      }
    }
  }, [loading, user, isAllowed, router]);

  if (loading || !user || !isAllowed) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-400 text-sm font-sans">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
          <span>Loading Resilience Operations...</span>
        </div>
      </div>
    );
  }

  return <OpsShell>{children}</OpsShell>;
}
