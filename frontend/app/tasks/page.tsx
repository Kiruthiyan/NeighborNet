"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TasksRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ops/tasks");
  }, [router]);

  return <div className="p-8 text-center text-xs text-slate-400">Redirecting to Tasks...</div>;
}
