"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuditRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ops/audit");
  }, [router]);

  return <div className="p-8 text-center text-xs text-slate-400">Redirecting to Audit Trail...</div>;
}
