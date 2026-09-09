"use client";

import { LogOut, Radio, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { NavLink } from "./NavLink";
import { useAuth } from "../lib/auth";

export const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Resources", href: "/resources" },
  { label: "Requests", href: "/requests" }
];

export const volunteerNavItems = [{ label: "Volunteers", href: "/volunteers" }];

export const coordinatorNavItems = [
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

export const adminNavItems = [
  { label: "Manage Users", href: "/admin/users" },
  { label: "Invitations", href: "/admin/invitations" }
];

function NavGroup({
  title,
  items
}: {
  title: string;
  items: { label: string; href: string }[];
}) {
  if (items.length === 0) return null;
  return (
    <>
      <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </div>
      <nav className="mb-6 grid gap-1">
        {items.map((item) => (
          <NavLink href={item.href} key={item.href}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export function AppShell({
  children,
  title,
  description,
  requireAdmin = false
}: {
  children: ReactNode;
  title: string;
  description?: string;
  /** Redirect non-admins to the dashboard - used by /admin/* pages, since the
   * sidebar already hides these links but a direct URL visit still needs
   * enforcing (the backend enforces it regardless either way). */
  requireAdmin?: boolean;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (requireAdmin && !user.is_admin) {
      router.replace("/");
    }
  }, [loading, user, requireAdmin, router]);

  if (loading || !user || (requireAdmin && !user.is_admin)) {
    return (
      <main className="grid min-h-screen place-items-center bg-mist text-sm text-slate-500">
        Loading…
      </main>
    );
  }

  const canSeeCoordinatorNav = user.is_coordinator;

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

          <NavGroup items={navItems} title="Community Ops" />
          {user.is_volunteer && <NavGroup items={volunteerNavItems} title="My Volunteering" />}
          {canSeeCoordinatorNav && (
            <>
              <NavGroup items={coordinatorNavItems} title="Coordination" />
              <NavGroup items={disasterNavItems} title="Disaster Response" />
              <NavGroup items={agentNavItems} title="AI Agent" />
            </>
          )}
          {user.is_admin && <NavGroup items={adminNavItems} title="Admin" />}

          <div className="mt-auto border-t border-slate-200 pt-3">
            <div className="flex items-center gap-2 px-3 py-1 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{user.name}</div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {user.is_admin && <RoleBadge label="Admin" />}
                  {user.is_coordinator && !user.is_admin && <RoleBadge label="Coordinator" />}
                  {user.is_donor && <RoleBadge label="Donor" />}
                  {user.is_volunteer && <RoleBadge label="Volunteer" />}
                </div>
              </div>
              <button
                className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-ink"
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                title="Log out"
                type="button"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
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

function RoleBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-field px-1.5 py-0.5 text-[10px] font-medium text-leaf">
      <ShieldCheck size={10} />
      {label}
    </span>
  );
}
