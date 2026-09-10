"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Flame,
  CheckSquare,
  Users,
  Package,
  HeartHandshake,
  ShieldCheck,
  Bot,
  Activity,
  ArrowRight,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { MetricCard, Panel, ModeSwitch, StatusBadge, EmptyState } from "../../../components/ui";
import { apiGet } from "../../../lib/api";

export default function OpsDashboardPage() {
  const [mode, setMode] = useState<"NORMAL" | "DISASTER">("NORMAL");
  const [requests, setRequests] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [disasters, setDisasters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOpsData() {
      try {
        const [reqs, dests, vols, tsk, decs, dis] = await Promise.all([
          apiGet<any[]>("/requests", []),
          apiGet<any[]>("/resources", []),
          apiGet<any[]>("/volunteers", []),
          apiGet<any[]>("/tasks", []),
          apiGet<any[]>("/decisions/pending", []),
          apiGet<any[]>("/disasters", []),
        ]);

        setRequests(Array.isArray(reqs) ? reqs : []);
        setResources(Array.isArray(dests) ? dests : []);
        setVolunteers(Array.isArray(vols) ? vols : []);
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
    }
    loadOpsData();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in text-slate-100 font-sans">
      {/* Ops Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
              Resilience Command Center
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Unified Coordination Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            {mode === "NORMAL"
              ? "Everyday food recovery and surplus resource matching across community hubs."
              : "Disaster Mode active: Emergency volunteer dispatch, disruption routing, and hazard mitigation."}
          </p>
        </div>

        <ModeSwitch mode={mode} onToggle={setMode} />
      </div>

      {/* Pending Decisions Alert Banner */}
      {decisions.length > 0 && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-amber-300">
                {decisions.length} Safety Approval{decisions.length > 1 ? "s" : ""} Pending Review
              </h3>
              <p className="text-[11px] text-amber-200/80">
                Medium-risk actions require coordinator verification before execution.
              </p>
            </div>
          </div>
          <Link
            href="/ops/decisions"
            className="rounded-lg bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-sm transition-all"
          >
            Review Decisions
          </Link>
        </div>
      )}

      {/* Six Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          dark
          title="Community Readiness"
          value="94%"
          explanation="Operational capability across active zones"
          trend="+3% this week"
          trendDirection="up"
          icon={Activity}
        />
        <MetricCard
          dark
          title="Active Requests"
          value={requests.length}
          explanation="Open food & supply fulfillment requests"
          trend={`${requests.filter((r) => r.status === "PENDING").length} pending`}
          trendDirection="neutral"
          icon={HeartHandshake}
        />
        <MetricCard
          dark
          title="Inventory Surplus"
          value={`${resources.length} batches`}
          explanation="Registered donations ready for dispatch"
          trend="Stock healthy"
          trendDirection="up"
          icon={Package}
        />
        <MetricCard
          dark
          title="Active Volunteers"
          value={volunteers.length}
          explanation="Verified drivers & response personnel"
          trend="Ready for dispatch"
          trendDirection="up"
          icon={Users}
        />
        <MetricCard
          dark
          title="Active Tasks"
          value={tasks.length}
          explanation="Logistics tasks in execution"
          trend="Optimal routing"
          trendDirection="up"
          icon={CheckSquare}
        />
        <MetricCard
          dark
          title="Human Decisions Avoided"
          value="142"
          explanation="AI deterministic engine safe auto-executions"
          trend="92% automation rate"
          trendDirection="up"
          icon={Bot}
        />
      </div>

      {/* Mode-Specific Operations Panels */}
      {mode === "DISASTER" ? (
        <div className="space-y-6">
          <Panel
            dark
            title="Disaster Emergency Command"
            subtitle="Active emergency coordination and volunteer response pipeline"
            icon={Flame}
            iconClassName="text-rose-400"
          >
            {disasters.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No active disaster declarations. Click "Disaster Response" tab to declare an emergency.
              </div>
            ) : (
              <div className="space-y-4">
                {disasters.map((disaster) => (
                  <div
                    key={disaster.id || disaster.disaster_id}
                    className="p-5 rounded-xl border border-rose-500/30 bg-rose-950/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
                        <h3 className="text-sm font-bold text-white">{disaster.name || disaster.disaster_type}</h3>
                        <span className="rounded bg-rose-500/20 text-rose-300 px-2 py-0.5 text-[10px] font-bold border border-rose-500/30">
                          SEVERITY: {disaster.severity || "HIGH"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Affected Zone: <span className="font-semibold text-white">{disaster.zone || "Zone 1"}</span> • Status: <span className="font-semibold text-emerald-400">{disaster.status || "ACTIVE"}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href="/ops/disasters"
                        className="rounded-lg bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all"
                      >
                        Manage Pipeline
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Normal Mode: Matching Activity */}
          <Panel
            dark
            title="Recent Matching Activity"
            subtitle="Automated donor-to-recipient assignments"
            icon={Sparkles}
            iconClassName="text-sky-400"
          >
            {requests.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No active request matches.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {requests.slice(0, 5).map((req) => (
                  <div key={req.id || req.request_id} className="py-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{req.resource_type} Request</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Qty: {req.quantity} • Urgency: {req.urgency}
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
          >
            {tasks.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No active logistics tasks.</div>
            ) : (
              <div className="divide-y divide-slate-800">
                {tasks.slice(0, 5).map((tsk) => (
                  <div key={tsk.id || tsk.task_id} className="py-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{tsk.task_type || "DELIVERY"}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Route: {tsk.pickup_location || "Hub"} → {tsk.delivery_location || "Destination"}
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
    </div>
  );
}
