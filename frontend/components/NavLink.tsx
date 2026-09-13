"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({
  href,
  children,
  onClick
}: {
  href: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
        active
          ? "bg-emerald-50 text-emerald-800 font-semibold"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
      href={href}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
