"use client";

import { useAuth } from "../../lib/auth";
import CommunityShell from "../../components/CommunityShell";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-500 text-sm">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <span>Loading Community Portal...</span>
        </div>
      </div>
    );
  }

  return <CommunityShell>{children}</CommunityShell>;
}
