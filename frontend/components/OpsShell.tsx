"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  HeartHandshake,
  Package,
  Users,
  Kanban,
  Flame,
  RotateCcw,
  ShieldCheck,
  FileText,
  Bot,
  UserCheck,
  Mail,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ArrowLeftRight,
  Activity,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { ModeSwitch } from "./ui";
import { apiGet } from "../lib/api";

const THEME_KEY = "nn_ops_theme";

export default function OpsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mode, setMode] = useState<"NORMAL" | "DISASTER">("NORMAL");
  const [theme, setTheme] = useState<"LIGHT" | "DARK">("DARK");
  const [pendingDecisionsCount, setPendingDecisionsCount] = useState(0);

  // Route guard: nav items are hidden per-role, but that's cosmetic only -
  // an unauthenticated visitor must not be able to sit on an /ops/* page at
  // all (the backend already enforces real per-endpoint authorization; this
  // is the same redirect-away behavior AppShell has always had).
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/");
  }, [loading, user, router]);

  // Persist theme to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(THEME_KEY) as "LIGHT" | "DARK" | null;
      if (saved) setTheme(saved);
    }
  }, []);

  const handleSetTheme = (t: "LIGHT" | "DARK") => {
    setTheme(t);
    if (typeof window !== "undefined") localStorage.setItem(THEME_KEY, t);
  };

  // Load pending decisions count
  useEffect(() => {
    async function loadDecisions() {
      const data = await apiGet<any[]>("/decisions/pending", []);
      if (Array.isArray(data)) setPendingDecisionsCount(data.length);
    }
    loadDecisions();
  }, []);

  // Close drawer on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) setMobileOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileOpen]);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const opsNavItems = [
    { label: "Dashboard",           href: "/ops/dashboard",   icon: LayoutDashboard },
    { label: "Requests",            href: "/ops/requests",    icon: HeartHandshake },
    { label: "Resources",           href: "/ops/resources",   icon: Package },
    { label: "Volunteers",          href: "/ops/volunteers",  icon: Users },
    { label: "Task Board",          href: "/ops/tasks",       icon: Kanban },
  ];

  const safetyNavItems = [
    { label: "Disaster Response",   href: "/ops/disasters",   icon: Flame,       badge: mode === "DISASTER" ? "ACTIVE" : undefined },
    { label: "Recovery Center",     href: "/ops/recovery",    icon: RotateCcw },
    { label: "Safety & Decisions",  href: "/ops/decisions",   icon: ShieldCheck, badgeCount: pendingDecisionsCount },
    { label: "Audit Trail",         href: "/ops/audit",       icon: FileText },
  ];

  const agentNavItems = [
    { label: "Auto-Dispatch Agent", href: "/ops/dispatch",    icon: Bot,      badge: "AI" },
    { label: "AI Assistant",        href: "/ops/agent",       icon: Activity, badge: "AI" },
  ];

  const adminNavItems = [
    { label: "Users & Roles", href: "/ops/admin/users",        icon: UserCheck },
    { label: "Invitations",   href: "/ops/admin/invitations",  icon: Mail },
  ];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const isLight = theme === "LIGHT";

  // Static Tailwind classes: light styles as default, dark styles via the `dark:` variant.
  // A single `dark` class is toggled on the wrapper below — no per-token ternaries needed.
  const border = "border-slate-200 dark:border-slate-800";
  const label = "text-slate-600 dark:text-slate-400";
  const activeCls = "bg-sky-50 text-sky-700 border border-sky-200 font-bold dark:bg-sky-600/20 dark:text-sky-400 dark:border-sky-500/30";

  type NavEntry = { label: string; href: string; icon: typeof opsNavItems[0]["icon"]; badge?: string; badgeCount?: number };

  const NavItem = ({ item }: { item: NavEntry }) => {
    const Icon = item.icon;
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        aria-current={isActive ? "page" : undefined}
        className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
          isActive
            ? activeCls
            : "text-slate-700 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon
            size={16}
            className={`shrink-0 ${isActive
              ? "text-sky-600 dark:text-sky-400"
              : "text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
            }`}
          />
          <span className="truncate">{item.label}</span>
        </div>
        {item.badge ? (
          <span className="ml-1 shrink-0 rounded bg-rose-500/20 text-rose-500 border border-rose-500/30 px-1.5 py-0.5 text-[10px] font-bold">
            {item.badge}
          </span>
        ) : (item as any).badgeCount > 0 ? (
          <span className="ml-1 shrink-0 rounded-full bg-amber-500 text-slate-950 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-black">
            {(item as any).badgeCount}
          </span>
        ) : isActive ? (
          <div className="shrink-0 h-1.5 w-1.5 rounded-full bg-sky-500" />
        ) : null}
      </Link>
    );
  };

  const SidebarInner = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={`mb-3 pb-3 border-b ${border}`}>
        <Link href="/ops/dashboard" className="flex items-center gap-3 group" onClick={() => setMobileOpen(false)}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white font-black text-base shadow-md group-hover:shadow-lg transition-shadow">
            NN
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-none text-slate-900 dark:text-white">
              NeighborNet
            </h1>
            <span className="text-[11px] font-semibold text-sky-500 flex items-center gap-1.5 mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
              Resilience Ops
            </span>
          </div>
        </Link>
      </div>

      {/* Mode selector */}
      <div className="mb-4">
        <div className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${label}`}>
          Operating Mode
        </div>
        <ModeSwitch mode={mode} onToggle={setMode} />
      </div>

      {/* Main nav */}
      <div className={`px-1 mb-1.5 text-[10px] font-bold uppercase tracking-wider ${label}`}>
        Operations
      </div>
      <nav className="space-y-0.5 mb-4" aria-label="Operations">
        {opsNavItems.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </nav>

      {/* Emergency & Safety nav */}
      <div className={`px-1 mb-1.5 text-[10px] font-bold uppercase tracking-wider ${label}`}>
        Emergency &amp; Safety
      </div>
      <nav className="space-y-0.5 mb-4 flex-1 overflow-y-auto" aria-label="Emergency and safety">
        {safetyNavItems.map((item) => (
          <NavItem key={item.href} item={item as any} />
        ))}
      </nav>

      {/* Agent nav */}
      <div className={`px-1 mb-1.5 text-[10px] font-bold uppercase tracking-wider ${label}`}>
        AI Agents
      </div>
      <nav className="space-y-0.5 mb-4" aria-label="AI agents">
        {agentNavItems.map((item) => (
          <NavItem key={item.href} item={item as any} />
        ))}
      </nav>

      {/* Admin nav */}
      {(user?.is_admin || user?.is_coordinator) && (
        <>
          <div className={`px-1 mb-1.5 text-[10px] font-bold uppercase tracking-wider ${label}`}>
            Administration
          </div>
          <nav className="space-y-0.5 mb-4" aria-label="Administration">
            {adminNavItems.map((item) => (
              <NavItem key={item.href} item={item as any} />
            ))}
          </nav>
        </>
      )}

      {/* Portal switch */}
      <div className={`rounded-xl border ${border} p-3 mb-3 bg-slate-100 dark:bg-slate-800/60`}>
        <Link
          href="/community/dashboard"
          onClick={() => setMobileOpen(false)}
          className="flex items-center justify-between w-full text-xs font-bold text-sky-600 hover:text-sky-500 transition-colors"
        >
          <span className="flex items-center gap-2">
            <ArrowLeftRight size={14} />
            Community Portal
          </span>
          <ChevronRight size={14} />
        </Link>
      </div>

      {/* User profile */}
      <div className={`border-t ${border} pt-3`}>
        <div className="flex items-center justify-between rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white font-bold text-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-slate-900 dark:text-slate-200">
                {user?.name || "Coordinator"}
              </p>
              <p className="text-[10px] text-sky-500 font-semibold truncate">
                {user?.is_admin ? "Administrator" : "Coordinator"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="shrink-0 p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-100/20 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`ops-context min-h-screen flex flex-col md:flex-row font-sans transition-colors duration-200 ${
        isLight ? "bg-slate-50 text-slate-900" : "dark bg-slate-950 text-slate-100"
      }`}
    >
      {/* ── Skip link ──────────────────────────────────────────── */}
      <a href="#ops-main-content" className="skip-link">Skip to main content</a>

      {/* ── Mobile top bar ─────────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between border-b px-4 py-3 sticky top-0 z-40 shadow-sm bg-white border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-white">
        <Link
          href="/ops/dashboard"
          className="flex items-center gap-2 font-bold"
          onClick={() => setMobileOpen(false)}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white font-black text-sm shadow-md">
            NN
          </div>
          <span>Ops Portal</span>
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleSetTheme(isLight ? "DARK" : "LIGHT")}
            title={isLight ? "Switch to dark theme" : "Switch to light theme"}
            aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            {isLight ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* ── Mobile overlay ─────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Left sidebar ───────────────────────────────────────── */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 border-r flex flex-col transition-transform duration-300 md:translate-x-0 bg-white border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Operations sidebar"
      >
        {/* Mobile close button */}
        <div className={`md:hidden flex items-center justify-between border-b px-4 py-3 ${border}`}>
          <span className="text-sm font-bold text-slate-900 dark:text-white">Menu</span>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarInner />
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Desktop top bar */}
        <header className="hidden md:flex items-center justify-between border-b px-6 py-3 sticky top-0 z-30 backdrop-blur-md transition-colors bg-white/90 border-slate-200/90 text-slate-900 dark:bg-slate-900/90 dark:border-slate-800 dark:text-slate-100">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${label}`}>Portal:</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
              Resilience Operations
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSetTheme(isLight ? "DARK" : "LIGHT")}
              title={isLight ? "Switch to dark theme" : "Switch to light theme"}
              aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              {isLight ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </header>

        <main
          id="ops-main-content"
          className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8 animate-fade-in"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
