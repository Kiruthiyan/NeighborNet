"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";

export default function VolunteersRedirectPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user?.is_coordinator || user?.is_admin) {
        router.replace("/ops/volunteers");
      } else {
        router.replace("/community/volunteer");
      }
    }
  }, [loading, user, router]);

  return <div className="p-8 text-center text-xs text-slate-400">Redirecting to Volunteers...</div>;
}
