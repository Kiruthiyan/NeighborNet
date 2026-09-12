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
  ShieldAlert,
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
  Bell,
  ArrowLeftRight,
  Flame,
  Activity,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { ModeSwitch } from "./ui";
import { apiGet } from "../lib/api";

export default function OpsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mode, setMode] = useState<"NORMAL" | "DISASTER">("NORMAL");
  const [theme, setTheme] = useState<"LIGHT" | "DARK">("LIGHT");
  const [pendingDecisionsCount, setPendingDecisionsCount] = useState(0);

  useEffect(() => {
    // Load decisions count for top bar badge
    async function loadDecisions() {
      const data = await apiGet<any[]>("/decisions/pending", []);
      if (Array.isArray(data)) {
        setPendingDecisionsCount(data.length);
      }
    }
    loadDecisions();
  }, []);

  const opsNavItems = [
    { label: "Dashboard", href: "/ops/dashboard", icon: LayoutDashboard },
    { label: "Auto-Dispatch Agent", href: "/ops/dispatch", icon: Bot, badge: "AI AGENT" },
    { label: "Requests", href: "/ops/requests", icon: HeartHandshake },
    { label: "Resources", href: "/ops/resources", icon: Package },
    { label: "Volunteers", href: "/ops/volunteers", icon: Users },
    { label: "Task Board", href: "/ops/tasks", icon: Kanban },
    { label: "Disaster Response", href: "/ops/disasters", icon: Flame, badge: mode === "DISASTER" ? "ACTIVE" : undefined },
    { label: "Recovery Center", href: "/ops/recovery", icon: RotateCcw },
    { label: "Safety & Decisions", href: "/ops/decisions", icon: ShieldCheck, badgeCount: pendingDecisionsCount },
    { label: "Audit Trail", href: "/ops/audit", icon: FileText },
    { label: "AI Assistant", href: "/ops/agent", icon: Activity },
  ];

  const adminNavItems = [
    { label: "Users & Roles", href: "/ops/admin/users", icon: UserCheck },
    { label: "Invitations", href: "/ops/admin/invitations", icon: Mail },
  ];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const isLight = theme === "LIGHT";

  return (
    <div className={`min-h-screen flex flex-col md:flex-row font-sans transition-colors duration-200 ${
      isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"
    }`}>
      {/* Mobile Header */}
      <div className={`md:hidden flex items-center justify-between border-b px-4 py-3 sticky top-0 z-40 ${
        isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-slate-800 text-white"
      }`}>
        <Link href="/ops/dashboard" className="flex items-center gap-2 font-bold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white font-black text-sm shadow-md">
            NN
          </div>
          <span>Ops Portal</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`p-2 rounded-lg ${isLight ? "text-slate-600 hover:bg-slate-100" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Left Operations Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 border-r flex flex-col justify-between transition-all duration-300 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          isLight ? "bg-white border-slate-200/90 text-slate-900 shadow-sm" : "bg-slate-900 border-slate-800 text-slate-100"
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto p-4">
          {/* Logo & Ops Portal Header */}
          <div className={`mb-4 pb-3 border-b ${isLight ? "border-slate-200" : "border-slate-800"}`}>
            <Link href="/ops/dashboard" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white font-black text-base shadow-md">
                NN
              </div>
              <div>
                <h1 className={`font-extrabold text-base leading-none ${isLight ? "text-slate-900" : "text-white"}`}>NeighborNet</h1>
                <span className="text-[11px] font-bold text-sky-600 flex items-center gap-1.5 mt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                  Resilience Operations
                </span>
              </div>
            </Link>
          </div>

          {/* Operating Mode Selector */}
          <div className="mb-3">
            <div className={`text-[10px] font-extrabold uppercase tracking-wider mb-1.5 px-1 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              Operating Mode
            </div>
            <ModeSwitch mode={mode} onToggle={setMode} />
          </div>

          {/* Theme Switcher Toggle */}
          <div className="mb-4 p-1.5 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold text-slate-700 px-1">Theme:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTheme("LIGHT")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all ${
                  isLight ? "bg-white text-slate-900 shadow-xs border border-slate-200" : "text-slate-400 hover:text-white"
                }`}
              >
                ☀️ Light
              </button>
              <button
                onClick={() => setTheme("DARK")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all ${
                  !isLight ? "bg-sky-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🌙 Dark
              </button>
            </div>
          </div>

          {/* Main Navigation */}
          <div className={`px-1 mb-1 text-[10px] font-extrabold uppercase tracking-wider ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            Coordination Center
          </div>
          <nav className="space-y-1 mb-5">
            {opsNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                    isActive
                      ? isLight
                        ? "bg-sky-50 text-sky-700 border border-sky-200 font-extrabold shadow-xs"
                        : "bg-sky-600/20 text-sky-400 border border-sky-500/30 font-bold"
                      : isLight
                      ? "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                      : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      size={17}
                      className={isActive ? "text-sky-600" : isLight ? "text-slate-600 group-hover:text-slate-800" : "text-slate-400 group-hover:text-slate-200"}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge ? (
                    <span className="rounded bg-rose-500/20 text-rose-600 border border-rose-500/30 px-1.5 py-0.5 text-[10px] font-extrabold animate-pulse">
                      {item.badge}
                    </span>
                  ) : item.badgeCount && item.badgeCount > 0 ? (
                    <span className="rounded-full bg-amber-500 text-slate-950 px-1.5 py-0.2 text-[10px] font-black">
                      {item.badgeCount}
                    </span>
                  ) : isActive ? (
                    <div className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {/* Admin Navigation (if admin or coordinator) */}
          {(user?.is_admin || user?.is_coordinator) && (
            <>
              <div className={`px-1 mb-1 text-[10px] font-extrabold uppercase tracking-wider ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                Administration
              </div>
              <nav className="space-y-1 mb-5">
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                        isActive
                          ? isLight
                            ? "bg-purple-50 text-purple-700 border border-purple-200 font-extrabold shadow-xs"
                            : "bg-purple-600/20 text-purple-400 border border-purple-500/30 font-bold"
                          : isLight
                          ? "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                          : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          size={17}
                          className={isActive ? "text-purple-600" : isLight ? "text-slate-600 group-hover:text-slate-800" : "text-slate-400 group-hover:text-slate-200"}
                        />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <div className="h-1.5 w-1.5 rounded-full bg-purple-500" />}
                    </Link>
                  );
                })}
              </nav>
            </>
          )}

          {/* Switch to Community Portal Link */}
          <div className={`my-2 p-3 rounded-xl border ${
            isLight ? "bg-emerald-50/60 border-emerald-200" : "bg-slate-800/60 border-slate-700/60"
          }`}>
            <Link
              href="/community/dashboard"
              className="flex items-center justify-between w-full text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              <span className="flex items-center gap-2">
                <ArrowLeftRight size={14} />
                User Portal
              </span>
              <ChevronRight size={14} />
            </Link>
          </div>

          {/* Logged in Admin Profile Panel */}
          <div className={`pt-3 border-t mt-auto ${isLight ? "border-slate-200" : "border-slate-800"}`}>
            <div className={`flex items-center justify-between p-2 rounded-xl ${isLight ? "bg-slate-100/70" : "bg-slate-800/40"}`}>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white font-bold text-xs shadow-xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
                </div>
                <div className="overflow-hidden">
                  <p className={`text-xs font-bold truncate ${isLight ? "text-slate-900" : "text-slate-200"}`}>{user?.name || "Coordinator"}</p>
                  <p className="text-[10px] text-sky-600 font-semibold truncate">
                    {user?.is_admin ? "Administrator" : "Coordinator"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header Bar for Desktop */}
        <header className={`hidden md:flex items-center justify-between border-b px-6 py-3 sticky top-0 z-30 backdrop-blur-md transition-colors ${
          isLight ? "bg-white/90 border-slate-200/90 text-slate-900" : "bg-slate-900/90 border-slate-800 text-slate-100"
        }`}>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-extrabold uppercase tracking-wider ${isLight ? "text-slate-600" : "text-slate-400"}`}>Portal:</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${
              isLight ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-sky-500/10 text-sky-400 border-sky-500/20"
            }`}>
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse"></span>
              Resilience Operations
            </span>
          </div>

          <div className="flex items-center gap-4">
            {pendingDecisionsCount > 0 && (
              <Link
                href="/ops/decisions"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs font-bold hover:bg-amber-500/20 transition-all"
              >
                <ShieldCheck size={16} />
                <span>{pendingDecisionsCount} Pending Decision{pendingDecisionsCount > 1 ? "s" : ""}</span>
              </Link>
            )}

            <Link
              href="/community/dashboard"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isLight ? "bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200" : "bg-slate-800 text-slate-300 hover:text-white border-slate-700"
              }`}
            >
              <ArrowLeftRight size={14} />
              <span>Switch to User View</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
