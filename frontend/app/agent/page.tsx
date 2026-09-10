"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AgentRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ops/agent");
  }, [router]);

  return <div className="p-8 text-center text-xs text-slate-400">Redirecting to Operations Assistant...</div>;
}
