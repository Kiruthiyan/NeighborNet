"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      className={`rounded px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-field font-medium text-leaf"
          : "text-slate-600 hover:bg-field hover:text-ink"
      }`}
      href={href}
    >
      {children}
    </Link>
  );
}
