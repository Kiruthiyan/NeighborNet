"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckSquare, AlertTriangle, ShieldCheck, Check, Truck, MapPin,
  Clock, Info, Users, Flame, Heart, Package, Zap, CheckCircle2
} from "lucide-react";
import { Panel, Table, StatusBadge, EmptyState } from "../../../components/ui";
import { apiGet, request } from "../../../lib/api";

// ─── Re-use the same pool helpers from alerts page ──────────────────────────

interface VolunteerOpp {
  id: string; title: string; description: string; location: string;
  urgency: "CRITICAL" | "HIGH" | "MEDIUM"; category: string;
  peopleHelped: number; estimatedTime: string; claimedBy: string | null; postedAt: string;
}

const STORAGE_KEY = "neighbornet_opp_pool";
const MY_USER_ID  = "current_user";

function loadOpps(): VolunteerOpp[] {
  if (typeof window === "undefined") return [];
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

const urgencyColor = {
  CRITICAL: "bg-rose-100 text-rose-700 border-rose-200",
  HIGH:     "bg-orange-100 text-orange-700 border-orange-200",
  MEDIUM:   "bg-amber-100 text-amber-700 border-amber-200",
};

const catIcon: Record<string, React.ReactNode> = {
  DELIVERY:  <Truck size={13} />,
  MEDICAL:   <Heart size={13} />,
  SHELTER:   <Package size={13} />,
  FOOD_DIST: <CheckSquare size={13} />,
  RESCUE:    <Flame size={13} />,
};

export default function CommunityVolunteerPage() {
  const [tasks, setTasks]         = useState<any[]>([]);
  const [disasters, setDisasters] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [myOpps, setMyOpps]       = useState<VolunteerOpp[]>([]);

  const [available, setAvailable] = useState(true);
  const [hasVehicle, setHasVehicle] = useState(true);
  const [skills] = useState<string[]>(["Delivery", "First Aid"]);

  // load accepted opps from pool
  const refreshMyOpps = useCallback(() => {
    setMyOpps(loadOpps().filter(o => o.claimedBy === MY_USER_ID));
  }, []);

  useEffect(() => {
    refreshMyOpps();
    window.addEventListener("opp-pool-update", refreshMyOpps);
    return () => window.removeEventListener("opp-pool-update", refreshMyOpps);
  }, [refreshMyOpps]);

  useEffect(() => {
    async function load() {
      try {
        const [tsk, dis] = await Promise.all([
          apiGet<any[]>("/tasks", []),
          apiGet<any[]>("/disasters", []),
        ]);
        setTasks(Array.isArray(tsk) ? tsk : []);
        setDisasters(Array.isArray(dis) ? dis : []);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-sky-100 text-sky-700"><CheckSquare size={22} /></div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Volunteer Tasks</h1>
          <p className="text-xs text-slate-500 mt-0.5">Your accepted opportunities, assigned tasks, and availability settings</p>
        </div>
      </div>

      {/* ── Volunteer Status ── */}
      <Panel title="My Volunteer Status" icon={ShieldCheck} iconClassName="text-emerald-600">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Availability toggle */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900">Active Availability</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{available ? "Ready for assignments" : "Currently unavailable"}</p>
            </div>
            <button
              onClick={() => setAvailable(!available)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${available ? "bg-emerald-600" : "bg-slate-300"}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${available ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          {/* Vehicle */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck size={16} className="text-slate-500" />
              <div>
                <p className="text-xs font-bold text-slate-900">Vehicle / Transport</p>
                <p className="text-[11px] text-slate-500">Car, van, or bicycle</p>
              </div>
            </div>
            <input type="checkbox" checked={hasVehicle} onChange={(e) => setHasVehicle(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
          </div>

          {/* Skills */}
          <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
            <p className="text-xs font-bold text-slate-900 mb-2">Registered Skills</p>
            <div className="flex flex-wrap gap-1">
              {skills.map(s => (
                <span key={s} className="rounded-md bg-sky-100 text-sky-800 px-2 py-0.5 text-[10px] font-semibold">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {/* ── Accepted Opportunities (from Alerts page) ── */}
      {myOpps.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 size={17} className="text-emerald-600" />
              Opportunities You Accepted
            </h2>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              {myOpps.length} active
            </span>
          </div>
          <p className="text-xs text-emerald-800/70">
            A coordinator will confirm your assignment. These slots are reserved for you.
          </p>

          <div className="space-y-2.5">
            {myOpps.map(opp => (
              <div key={opp.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-white border border-emerald-200 shadow-xs">
                <div className={`p-2 rounded-xl shrink-0 ${
                  opp.urgency === "CRITICAL" ? "bg-rose-100 text-rose-700" :
                  opp.urgency === "HIGH"     ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {catIcon[opp.category] ?? <CheckSquare size={13} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs font-bold text-slate-900">{opp.title}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgencyColor[opp.urgency]}`}>
                      {opp.urgency}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><MapPin size={10} />{opp.location}</span>
                    <span className="flex items-center gap-1"><Clock size={10} />{opp.estimatedTime}</span>
                    <span className="flex items-center gap-1"><Users size={10} />{opp.peopleHelped} people</span>
                  </div>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-300 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  <Check size={13} /> Accepted — Pending Confirmation
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Disaster Alerts ── */}
      {disasters.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-rose-900 flex items-center gap-2">
              <AlertTriangle size={17} className="text-rose-600 animate-bounce" /> Active Disaster Alerts
            </h2>
            <span className="text-[11px] font-bold text-rose-700 bg-rose-100 border border-rose-200 px-2.5 py-0.5 rounded-full">High Priority</span>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-white/80 border border-rose-200/80 p-3 text-xs text-slate-700">
            <Info size={14} className="text-rose-600 shrink-0 mt-0.5" />
            <p><strong>Eligibility Notice:</strong> Accepting an alert marks you eligible for assignment — confirm via Alerts page.</p>
          </div>
          {disasters.map(d => (
            <div key={d.id || d.disaster_id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-white border border-rose-100 shadow-xs">
              <div>
                <h3 className="text-xs font-bold text-slate-900">{d.name || d.disaster_type}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Zone: {d.zone || "Zone 1"} · Severity: {d.severity || "HIGH"}</p>
              </div>
              <a href="/community/alerts" className="rounded-lg bg-rose-700 hover:bg-rose-800 text-white px-3.5 py-1.5 text-xs font-semibold transition-all shadow-xs">
                Respond via Alerts →
              </a>
            </div>
          ))}
        </div>
      )}

      {/* ── Task Board ── */}
      <Panel title="My Assigned Task Board" icon={CheckSquare} iconClassName="text-sky-600"
        subtitle="Tasks assigned by coordinators appear here">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading tasks…</div>
        ) : tasks.length === 0 ? (
          <EmptyState icon={CheckSquare}>
            <p className="font-semibold text-slate-700">No active assignments yet</p>
            <p className="text-xs text-slate-500 mt-1">Enable notifications on the Alerts page and accept opportunities — coordinators will confirm and assign tasks here.</p>
          </EmptyState>
        ) : (
          <Table columns={["Task ID", "Type", "Route", "Priority", "Status", "Risk", "Action"]}>
            {tasks.map((task) => (
              <tr key={task.id || task.task_id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3 font-mono font-bold text-xs text-slate-700">{task.task_id || task.id || "TSK-101"}</td>
                <td className="px-4 py-3 font-semibold text-slate-900 text-xs">{task.task_type || "DELIVERY"}</td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1"><MapPin size={11} className="text-slate-400" />{task.pickup_location || "Hub"} → {task.delivery_location || "Recipient"}</span>
                </td>
                <td className="px-4 py-3 text-xs font-semibold text-slate-700">{task.priority || "MEDIUM"}</td>
                <td className="px-4 py-3"><StatusBadge status={task.status || "ASSIGNED"} pulse={task.status === "IN_PROGRESS"} /></td>
                <td className="px-4 py-3">
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">{task.risk_level || "Green"}</span>
                </td>
                <td className="px-4 py-3">
                  <button className="text-sky-600 hover:text-sky-700 font-semibold text-xs hover:underline">View Details</button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </div>
  );
}
