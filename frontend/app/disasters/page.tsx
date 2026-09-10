"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DisastersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ops/disasters");
  }, [router]);

  return <div className="p-8 text-center text-xs text-slate-400">Redirecting to Disaster Command...</div>;
}
