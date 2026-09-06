import { Radio } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { NavLink } from "./NavLink";

export const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Resources", href: "/resources" },
  { label: "Requests", href: "/requests" },
  { label: "Volunteers", href: "/volunteers" },
  { label: "Active Plan", href: "/tasks" },
  { label: "Disruptions", href: "/disruptions" },
  { label: "Decisions", href: "/decisions" },
  { label: "Activity / Audit", href: "/audit" },
  { label: "Evaluations", href: "/evaluations" },
  { label: "Settings / Policies", href: "/settings" }
];

export const disasterNavItems = [
  { label: "Disaster Overview", href: "/disasters" },
  { label: "Volunteer Response", href: "/volunteer-response" },
  { label: "Disaster Task Board", href: "/disaster-tasks" }
];

export const agentNavItems = [{ label: "Agent Console", href: "/agent" }];

export function AppShell({
  children,
  title,
  description
}: {
  children: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <main className="min-h-screen bg-mist text-ink">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[240px_1fr]">
        <aside className="border-b border-slate-200 bg-white px-5 py-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <Link className="mb-8 flex items-center gap-3" href="/">
            <div className="grid h-10 w-10 place-items-center rounded bg-leaf text-white">
              <Radio size={21} />
            </div>
            <div>
              <div className="text-sm font-semibold">NeighborNet</div>
              <div className="text-xs text-slate-500">Resilience Ops</div>
            </div>
          </Link>

          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Community Ops
          </div>
          <nav className="mb-6 grid gap-1">
            {navItems.map((item) => (
              <NavLink href={item.href} key={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Disaster Response
          </div>
          <nav className="mb-6 grid gap-1">
            {disasterNavItems.map((item) => (
              <NavLink href={item.href} key={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            AI Agent
          </div>
          <nav className="grid gap-1">
            {agentNavItems.map((item) => (
              <NavLink href={item.href} key={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <section className="px-4 py-5 sm:px-6 lg:px-8">
          <header className="mb-5 border-b border-slate-200 pb-5">
            <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
            {description && (
              <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>
            )}
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
