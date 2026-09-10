"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  HeartHandshake,
  Package,
  CheckSquare,
  Bell,
  Activity,
  User,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../lib/auth";

export default function CommunityShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: "Dashboard", href: "/community/dashboard", icon: LayoutDashboard },
    { label: "My Requests", href: "/community/requests", icon: HeartHandshake },
    { label: "My Donations", href: "/community/donations", icon: Package },
    { label: "Volunteer Tasks", href: "/community/volunteer", icon: CheckSquare },
    { label: "Alerts", href: "/community/alerts", icon: Bell },
    { label: "Activity", href: "/community/activity", icon: Activity },
    { label: "Profile", href: "/community/profile", icon: User },
  ];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const isOpsUser = user?.is_coordinator || user?.is_admin;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sticky top-0 z-40">
        <Link href="/community/dashboard" className="flex items-center gap-2 font-bold text-slate-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-black text-sm">
            NN
          </div>
          <span>NeighborNet</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto p-4">
          {/* Logo & Portal Header */}
          <div className="mb-6 pb-4 border-b border-slate-100">
            <Link href="/community/dashboard" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black text-base shadow-sm">
                NN
              </div>
              <div>
                <h1 className="font-bold text-slate-900 text-base leading-none">NeighborNet</h1>
                <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 mt-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Community Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Nav Section Label */}
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Community Coordination
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? "bg-emerald-50 text-emerald-800 font-bold shadow-xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      size={18}
                      className={isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"}
                    />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />}
                </Link>
              );
            })}
          </nav>

          {/* Operations Switch Banner (if admin or coordinator) */}
          {isOpsUser && (
            <div className="my-4 p-3 rounded-xl bg-slate-900 text-white">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-400 mb-1">
                <ShieldAlert size={14} />
                Operations Access
              </div>
              <p className="text-[11px] text-slate-300 leading-tight mb-2.5">
                Switch to Resilience Operations Portal for coordinator tools.
              </p>
              <Link
                href="/ops/dashboard"
                className="flex items-center justify-between w-full rounded-lg bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white transition-all shadow-sm"
              >
                Go to Ops Portal
                <ChevronRight size={14} />
              </Link>
            </div>
          )}

          {/* User Profile Menu at Bottom */}
          <div className="pt-4 border-t border-slate-100 mt-auto">
            <div className="flex items-center justify-between rounded-xl p-2.5 hover:bg-slate-50 transition-all">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-900 truncate">{user?.name || "Member"}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user?.email || ""}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden min-h-screen">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
