"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HeartHandshake, Package, CheckSquare, Sparkles, ArrowRight,
  PlusCircle, Clock, TrendingUp, Bell, Activity, ChevronRight,
  Users, MapPin, Zap
} from "lucide-react";
import { useAuth } from "../../../lib/auth";
import { StatusBadge } from "../../../components/ui";
import { apiGet } from "../../../lib/api";

export default function CommunityDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests]   = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [tasks, setTasks]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [reqs, dests, tsk] = await Promise.all([
          apiGet<any[]>("/requests", []),
          apiGet<any[]>("/resources", []),
          apiGet<any[]>("/tasks", []),
        ]);
        setRequests(Array.isArray(reqs) ? reqs : []);
        setDonations(Array.isArray(dests) ? dests : []);
        setTasks(Array.isArray(tsk) ? tsk : []);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    loadData();
  }, []);

  const firstName = user?.name?.split(" ")[0] || "Neighbor";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Quick stat data
  const stats = [
    {
      label: "Active Requests",
      value: requests.length,
      sub: "awaiting match",
      icon: HeartHandshake,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
      href: "/community/requests",
    },
    {
      label: "My Donations",
      value: donations.length,
      sub: "items shared",
      icon: Package,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      href: "/community/donations",
    },
    {
      label: "Volunteer Tasks",
      value: tasks.length,
      sub: "assigned to you",
      icon: CheckSquare,
      color: "text-sky-600",
      bg: "bg-sky-50",
      border: "border-sky-100",
      href: "/community/volunteer",
    },
    {
      label: "Community Impact",
      value: "Active",
      sub: "local coordinator",
      icon: Zap,
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-100",
      href: "/community/activity",
    },
  ];

  // Quick actions
  const actions = [
    {
      title: "Request Help",
      desc: "Submit a request for food, supplies, or assistance",
      icon: HeartHandshake,
      iconBg: "bg-amber-100 text-amber-700",
      btn: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20",
      btnLabel: "Create Request",
      href: "/community/requests",
    },
    {
      title: "Donate Surplus",
      desc: "Share extra food, medicines, or household items",
      icon: Package,
      iconBg: "bg-emerald-100 text-emerald-700",
      btn: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20",
      btnLabel: "Add Donation",
      href: "/community/donations",
    },
    {
      title: "Volunteer",
      desc: "Respond to alerts and help deliver resources",
      icon: CheckSquare,
      iconBg: "bg-sky-100 text-sky-700",
      btn: "bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20",
      btnLabel: "View Opportunities",
      href: "/community/volunteer",
    },
  ];

  return (
    <div className="space-y-7 animate-fade-in">

      {/* ── Hero greeting ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-teal-800 to-slate-900 px-7 py-8 text-white shadow-lg">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-8 h-40 w-40 rounded-full bg-emerald-400/10 blur-2xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300/80 mb-1">
              {greeting}
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              {firstName} 👋
            </h1>
            <p className="mt-1.5 text-sm text-white/60 max-w-md leading-relaxed">
              Community coordination is active. Check your requests, contributions, and volunteer tasks below.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              href="/community/alerts"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 text-xs font-semibold text-white transition-all"
            >
              <Bell size={14} /> Alerts
            </Link>
            <Link
              href="/community/requests"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-semibold text-white transition-all shadow-sm"
            >
              <PlusCircle size={14} /> New Request
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl ${s.bg} ${s.border} border`}>
                  <Icon size={18} className={s.color} />
                </div>
                <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors mt-1" />
              </div>
              <div className="mt-4">
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                  {loading ? (
                    <span className="inline-block h-8 w-12 rounded-lg bg-slate-100 animate-pulse" />
                  ) : s.value}
                </div>
                <p className="mt-1.5 text-xs font-bold text-slate-700">{s.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Two-column: Quick Actions + Recent Requests ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Quick Actions — 2 cols */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={15} className="text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Quick Actions</h2>
          </div>
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <div
                key={a.title}
                className="group flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                onClick={() => router.push(a.href)}
              >
                <div className={`p-3 rounded-xl shrink-0 ${a.iconBg}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 leading-tight">{a.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{a.desc}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(a.href); }}
                  className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold shadow-sm transition-all ${a.btn}`}
                >
                  {a.btnLabel}
                </button>
              </div>
            );
          })}
        </div>

        {/* Recent Requests — 3 cols */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">Recent Requests</h2>
            </div>
            <Link
              href="/community/requests"
              className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
            >
              View all <ChevronRight size={13} />
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
            {loading ? (
              /* skeleton */
              <div className="divide-y divide-slate-100">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-4">
                    <div className="h-8 w-8 rounded-xl bg-slate-100 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-40 rounded bg-slate-100 animate-pulse" />
                      <div className="h-2.5 w-28 rounded bg-slate-100 animate-pulse" />
                    </div>
                    <div className="h-5 w-16 rounded-full bg-slate-100 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-500 mb-3">
                  <HeartHandshake size={24} />
                </div>
                <p className="text-sm font-semibold text-slate-700">No active requests</p>
                <p className="text-xs text-slate-400 mt-1">Submit a request whenever you need assistance</p>
                <button
                  onClick={() => router.push("/community/requests")}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all"
                >
                  <PlusCircle size={13} /> Create Request
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {requests.slice(0, 5).map((req, i) => (
                  <div key={req.id || req.request_id || i} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                    {/* left icon */}
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                      <HeartHandshake size={14} />
                    </div>
                    {/* content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {req.title || req.resource_type || req.resource_name || "Resource Request"}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400">
                        {req.quantity && <span>Qty: {req.quantity}</span>}
                        {(req.location || req.affected_location) && (
                          <span className="flex items-center gap-0.5">
                            <MapPin size={10} />
                            {req.location || req.affected_location}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* status */}
                    <div className="shrink-0">
                      <StatusBadge status={req.status || "Pending"} pulse={req.status === "MATCHED"} />
                    </div>
                  </div>
                ))}

                {/* Footer link */}
                {requests.length > 5 && (
                  <div className="px-5 py-3 bg-slate-50/60">
                    <Link href="/community/requests" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
                      +{requests.length - 5} more requests <ChevronRight size={12} />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Community info strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: Users,   label: "Active Members",    val: "2,400+", color: "text-emerald-600", bg: "bg-emerald-50" },
          { icon: MapPin,  label: "Covered Zones",     val: "12 Zones", color: "text-sky-600",     bg: "bg-sky-50"     },
          { icon: Clock,   label: "Avg. Response Time", val: "< 2 hours", color: "text-violet-600", bg: "bg-violet-50"  },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
              <div className={`p-2.5 rounded-xl ${item.bg} shrink-0`}>
                <Icon size={16} className={item.color} />
              </div>
              <div>
                <p className="text-base font-extrabold text-slate-900 tracking-tight">{item.val}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
