"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Flame,
  CheckSquare,
  Users,
  Package,
  HeartHandshake,
  Bot,
  Activity,
  Sparkles,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import {
  Panel, ModeSwitch, StatusBadge, EmptyState, AlertBanner
} from "../../../components/ui";
import {
  apiGet, getDashboardMetrics, DashboardMetrics
} from "../../../lib/api";
import { formatLocation } from "../../../lib/format";

const EMPTY_METRICS: DashboardMetrics = {
  users: 0,
  inventory: 0,
  requests: 0,
  volunteers: 0,
  disasters: 0,
  alerts: 0,
  tasks: 0,
  decisions: 0,
  events: 0,
  community_readiness: 0,
  active_requests: 0,
  inventory_batches: 0,
  active_volunteers: 0,
  active_disasters: 0,
  active_tasks: 0,
  completed_tasks: 0,
  pending_human_decisions: 0,
  human_decisions_avoided: 0,
};

export default function OpsDashboardPage() {
  const [mode, setMode] = useState<"NORMAL" | "DISASTER">("NORMAL");
  const [metrics, setMetrics] = useState<DashboardMetrics>(EMPTY_METRICS);
  const [requests, setRequests] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [disasters, setDisasters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, reqs, tsk, decs, dis] = await Promise.all([
        getDashboardMetrics(),
        apiGet<any[]>("/requests", []),
        apiGet<any[]>("/tasks", []),
        apiGet<any[]>("/decisions/pending", []),
        apiGet<any[]>("/disasters", []),
      ]);

      setMetrics(m);
      setRequests(Array.isArray(reqs) ? reqs : []);
      setTasks(Array.isArray(tsk) ? tsk : []);
      setDecisions(Array.isArray(decs) ? decs : []);
      setDisasters(Array.isArray(dis) ? dis : []);

      if (Array.isArray(dis) && dis.length > 0) {
        setMode("DISASTER");
      }
    } catch (err) {
      console.error("Failed to load ops dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const readinessPct = metrics.community_readiness > 0
    ? `${Math.round(metrics.community_readiness)}%`
    : `${metrics.active_volunteers > 0 ? "Active" : "—"}`;

  const statCards = [
    {
      label: "Community Readiness",
      value: readinessPct,
      sub: "Operational capability",
      icon: Activity,
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-950/40",
      border: "border-sky-100 dark:border-sky-800",
      href: "/ops/dashboard",
    },
    {
      label: "Active Requests",
      value: metrics.active_requests || metrics.requests,
      sub: `${requests.filter((r) => r.status === "PENDING").length} pending`,
      icon: HeartHandshake,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/40",
      border: "border-amber-100 dark:border-amber-800",
      href: "/ops/requests",
    },
    {
      label: "Inventory Surplus",
      value: `${metrics.inventory_batches || metrics.inventory} batches`,
      sub: "Ready for dispatch",
      icon: Package,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      border: "border-emerald-100 dark:border-emerald-800",
      href: "/ops/resources",
    },
    {
      label: "Active Volunteers",
      value: metrics.active_volunteers || metrics.volunteers,
      sub: "Ready for dispatch",
      icon: Users,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/40",
      border: "border-violet-100 dark:border-violet-800",
      href: "/ops/volunteers",
    },
    {
      label: "Active Tasks",
      value: metrics.active_tasks || metrics.tasks,
      sub: `${metrics.completed_tasks ?? 0} completed`,
      icon: CheckSquare,
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-950/40",
      border: "border-sky-100 dark:border-sky-800",
      href: "/ops/tasks",
    },
    {
      label: "AI Decisions Automated",
      value: metrics.human_decisions_avoided,
      sub: "Safe auto-executions",
      icon: Bot,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/40",
      border: "border-violet-100 dark:border-violet-800",
      href: "/ops/dispatch",
    },
  ];

  return (
    <div className="space-y-7 animate-fade-in text-slate-900 dark:text-slate-100 font-sans">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-700 via-sky-900 to-slate-900 px-6 py-7 sm:px-7 sm:py-8 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-8 h-40 w-40 rounded-full bg-sky-400/10 blur-2xl" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-300/80 mb-1">
              Resilience Command Center
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              Unified Coordination Dashboard
            </h1>
            <p className="mt-1.5 text-sm text-white/60 max-w-md leading-relaxed">
              {mode === "NORMAL"
                ? "Everyday food recovery and surplus resource matching across community hubs."
                : "Disaster Mode active: emergency volunteer dispatch, disruption routing, and hazard mitigation."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={loadData}
              disabled={loading}
              title="Refresh dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2 text-xs font-semibold text-white transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <ModeSwitch mode={mode} onToggle={setMode} />
          </div>
        </div>
      </div>

      {/* Pending decisions alert */}
      {decisions.length > 0 && (
        <AlertBanner tone="amber">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between w-full">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} className="shrink-0" />
              <div>
                <h3 className="text-sm font-bold">
                  {decisions.length} Safety Approval{decisions.length > 1 ? "s" : ""} Pending Review
                </h3>
                <p className="text-xs opacity-80 mt-0.5">
                  Medium-risk actions require coordinator verification before execution.
                </p>
              </div>
            </div>
            <Link
              href="/ops/decisions"
              className="shrink-0 rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all"
            >
              Review Decisions →
            </Link>
          </div>
        </AlertBanner>
      )}

      {/* Stat cards — real data from API */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white dark:border-slate-700/60 dark:bg-slate-800/80 p-4 sm:p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl ${s.bg} ${s.border} border shrink-0`}>
                  <Icon size={18} className={s.color} />
                </div>
                <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors mt-1 shrink-0" />
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                  {loading ? (
                    <span className="skeleton dark:skeleton-dark inline-block h-7 w-12 rounded-lg">&nbsp;</span>
                  ) : String(s.value)}
                </div>
                <p className="mt-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">{s.label}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{s.sub}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Disaster or normal mode panels */}
      {mode === "DISASTER" ? (
        <div className="space-y-6">
          <Panel
            dark
            title="Disaster Emergency Command"
            subtitle="Active emergency coordination and volunteer response pipeline"
            icon={Flame}
            iconClassName="text-rose-400"
          >
            {loading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-700 p-5 space-y-2">
                    <div className="skeleton-dark h-4 w-48 rounded" />
                    <div className="skeleton-dark h-3 w-64 rounded" />
                  </div>
                ))}
              </div>
            ) : disasters.length === 0 ? (
              <EmptyState icon={Flame} dark>
                <p className="font-semibold text-slate-300">No active disaster declarations</p>
                <p className="text-xs text-slate-500 mt-1">Click "Disaster Response" tab to declare an emergency</p>
              </EmptyState>
            ) : (
              <div className="space-y-4">
                {disasters.map((disaster) => (
                  <div
                    key={disaster.id || disaster.disaster_id}
                    className="rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{disaster.name || disaster.disaster_type}</h3>
                        <span className="rounded-md bg-rose-500/20 text-rose-700 dark:text-rose-300 px-2 py-0.5 text-[10px] font-bold border border-rose-500/30">
                          SEVERITY: {disaster.severity || "HIGH"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">
                        Zone: <span className="font-semibold text-slate-900 dark:text-white">{disaster.zone || "Zone 1"}</span>
                        {" · "}Status: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{disaster.status || "ACTIVE"}</span>
                      </p>
                    </div>
                    <Link
                      href="/ops/disasters"
                      className="shrink-0 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all"
                    >
                      Manage Pipeline →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Matching Activity */}
          <Panel
            dark
            title="Recent Matching Activity"
            subtitle="Automated donor-to-recipient assignments"
            icon={Sparkles}
            iconClassName="text-sky-400"
            action={
              <Link
                href="/ops/requests"
                className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
              >
                View all →
              </Link>
            }
          >
            {loading ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="py-3 flex items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="skeleton dark:skeleton-dark h-3 w-36 rounded" />
                      <div className="skeleton dark:skeleton-dark h-2.5 w-24 rounded" />
                    </div>
                    <div className="skeleton dark:skeleton-dark h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : requests.length === 0 ? (
              <EmptyState icon={HeartHandshake} dark>
                <p className="text-sm">No active request matches</p>
              </EmptyState>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {requests.slice(0, 6).map((req) => (
                  <div key={req.id || req.request_id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {req.resource_type || req.title || "Resource"} Request
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Qty: {req.quantity || req.quantity_requested || "—"} · Urgency:{" "}
                        {req.urgency || req.urgency_level || "normal"}
                      </p>
                    </div>
                    <StatusBadge status={req.status || "PENDING"} pulse={req.status === "MATCHED"} />
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Logistics Task Status */}
          <Panel
            dark
            title="Logistics Task Status"
            subtitle="Current delivery tasks & volunteer routes"
            icon={CheckSquare}
            iconClassName="text-emerald-400"
            action={
              <Link
                href="/ops/tasks"
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                View all →
              </Link>
            }
          >
            {loading ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="py-3 flex items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="skeleton dark:skeleton-dark h-3 w-32 rounded" />
                      <div className="skeleton dark:skeleton-dark h-2.5 w-48 rounded" />
                    </div>
                    <div className="skeleton dark:skeleton-dark h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <EmptyState icon={CheckSquare} dark>
                <p className="text-sm">No active logistics tasks</p>
              </EmptyState>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {tasks.slice(0, 6).map((tsk) => (
                  <div key={tsk.id || tsk.task_id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {tsk.task_type || tsk.title || "DELIVERY"}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {formatLocation(tsk.pickup_location, "Hub")} → {formatLocation(tsk.delivery_location || tsk.destination, "Destination")}
                      </p>
                    </div>
                    <StatusBadge status={tsk.status || "ASSIGNED"} />
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* Bottom info strip */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Users, label: "Total Users", val: metrics.users, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-950/40" },
            { icon: ShieldCheck, label: "Pending Decisions", val: metrics.pending_human_decisions || decisions.length, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40" },
            { icon: Flame, label: "Active Disasters", val: metrics.active_disasters || disasters.length, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/40" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 px-5 py-4 shadow-sm">
                <div className={`p-2.5 rounded-xl ${item.bg} shrink-0`}>
                  <Icon size={16} className={item.color} />
                </div>
                <div>
                  <p className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">{item.val}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">{item.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
