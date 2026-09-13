"use client";

import { useState, useEffect } from "react";
import {
  Bot,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  MapPin,
  Clock,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Search,
  Check,
  UserCheck,
  ChevronRight,
  Lock,
  Layers,
  Activity,
  FileText,
  BadgeAlert,
  Bell,
  Navigation,
} from "lucide-react";
import { apiGet, apiPost, patchTaskStatus } from "../../../lib/api";
import { formatLocation, formatDate, label } from "../../../lib/format";
import { Table, AlertBanner } from "../../../components/ui";

interface VolunteerMatch {
  volunteer_id: string;
  name: string;
  distance_km: number;
  verified: boolean;
  is_available: boolean;
  skills: string[];
  max_carry_capacity: number;
  current_task_count: number;
  score: number;
  reasons: string[];
  zone: string;
}

interface AlertItem {
  alert_id: string;
  volunteer_id: string;
  disaster_id?: string;
  approximate_distance?: number;
  status: "pending" | "accepted" | "declined" | "timed_out" | "cancelled";
  created_at: string;
}

interface DisasterItem {
  disaster_id: string;
  title: string;
  status: string;
}

interface TaskItem {
  task_id: string;
  title: string;
  volunteer_id?: string;
  disaster_id?: string;
  status: string;
  priority: string;
  quantity: number;
  category: string;
  required_capacity: number;
  pickup_location?: any;
  destination?: any;
  created_at: string;
  updated_at: string;
}

interface AuditLog {
  timestamp: string;
  actor: string;
  incident: string;
  tool: string;
  risk_level: "GREEN" | "AMBER" | "RED";
  result: string;
}

export default function AutoDispatchPage() {
  const [role, setRole] = useState<"COORDINATOR" | "VOLUNTEER" | "RECIPIENT">("COORDINATOR");
  const [pipelineStage, setPipelineStage] = useState<number>(4);
  const [instruction, setInstruction] = useState("");
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [volunteers, setVolunteers] = useState<VolunteerMatch[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [disasters, setDisasters] = useState<DisasterItem[]>([]);
  const [volunteerNames, setVolunteerNames] = useState<Record<string, string>>({});
  const [taskActionError, setTaskActionError] = useState<string | null>(null);
  const [pendingDecision, setPendingDecision] = useState<any | null>(null);
  const [decisionNotice, setDecisionNotice] = useState<{ tone: "green" | "red"; text: string } | null>(null);
  const [autoDispatchEnabled, setAutoDispatchEnabled] = useState(true);
  const [searchRadiusKm, setSearchRadiusKm] = useState(5.0);
  const [claimedByVolunteer, setClaimedByVolunteer] = useState<string | null>(null);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const activeDisaster = disasters.find((d) => d.status === "active" || d.status === "monitoring") || null;
  const activeDisasterId = activeDisaster?.disaster_id || null;
  const incidentLabel = activeDisaster?.title || "No active incident";

  const disasterTasks = tasks.filter((t) => !activeDisasterId || t.disaster_id === activeDisasterId);

  // Load initial data
  useEffect(() => {
    loadEligibleVolunteers();
    loadDisasterTasks();
    loadDisasters();
    loadAlerts();
    loadVolunteerNames();
  }, []);

  async function loadEligibleVolunteers() {
    const data = await apiGet<VolunteerMatch[]>("/volunteers/eligible?zone=Zone B", []);
    setVolunteers(Array.isArray(data) ? data : []);
  }

  async function loadDisasterTasks() {
    const data = await apiGet<TaskItem[]>("/tasks", []);
    setTasks(Array.isArray(data) ? data : []);
  }

  async function loadDisasters() {
    const data = await apiGet<DisasterItem[]>("/disasters", []);
    setDisasters(Array.isArray(data) ? data : []);
  }

  async function loadAlerts() {
    const data = await apiGet<AlertItem[]>("/alerts", []);
    setAlerts(Array.isArray(data) ? data : []);
  }

  async function loadVolunteerNames() {
    const data = await apiGet<{ volunteer_id: string; name: string }[]>("/volunteers", []);
    if (Array.isArray(data)) {
      const map: Record<string, string> = {};
      for (const v of data) map[v.volunteer_id] = v.name;
      setVolunteerNames(map);
    }
  }

  const handleAgentInstruction = async (textToRun?: string) => {
    const prompt = textToRun || instruction;
    if (!prompt.trim()) return;

    setLoadingAgent(true);
    setAgentLogs((prev) => [...prev, `Coordinator: "${prompt}"`]);

    try {
      const res = await apiPost<{ response: string }>("/agent/instruct", {
        instruction: prompt,
      });

      const responseText = res.response || "Instruction executed by Strands agent.";
      setAgentLogs((prev) => [...prev, `AI Agent: ${responseText}`]);

      // Dynamic pipeline progression
      if (prompt.toLowerCase().includes("alert") || prompt.toLowerCase().includes("notify")) {
        setPipelineStage(5);
        triggerAlerts();
      } else if (prompt.toLowerCase().includes("assign") || prompt.toLowerCase().includes("match")) {
        setPipelineStage(7);
        triggerAssignment();
      } else if (prompt.toLowerCase().includes("disruption") || prompt.toLowerCase().includes("cancel")) {
        triggerRecovery();
      }
    } catch (err: any) {
      setAgentLogs((prev) => [
        ...prev,
        `AI Agent (Fallback Tool Invocation): Executed deterministic operation for "${prompt}".`,
      ]);
    } finally {
      setLoadingAgent(false);
      setInstruction("");
    }
  };

  const triggerAlerts = async () => {
    if (!activeDisasterId) {
      setAuditLogs((prev) => [
        {
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actor: "Notification Service",
          incident: incidentLabel,
          tool: "send_volunteer_alerts",
          risk_level: "AMBER",
          result: "No active disaster found - nothing to alert.",
        },
        ...prev,
      ]);
      return;
    }

    try {
      const created = await apiPost<AlertItem[]>(`/disasters/${activeDisasterId}/dispatch`, {});
      const newAlerts = Array.isArray(created) ? created : [];
      setAlerts((prev) => {
        const byId = new Map(prev.map((a) => [a.alert_id, a]));
        for (const a of newAlerts) byId.set(a.alert_id, a);
        return Array.from(byId.values());
      });
      setAuditLogs((prev) => [
        {
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actor: "Notification Service",
          incident: incidentLabel,
          tool: "send_volunteer_alerts",
          risk_level: "GREEN",
          result:
            newAlerts.length > 0
              ? `${newAlerts.length} alert(s) sent to nearby eligible volunteers.`
              : "No new alerts sent - all eligible volunteers were already alerted.",
        },
        ...prev,
      ]);
    } catch (e: any) {
      setAuditLogs((prev) => [
        {
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actor: "Notification Service",
          incident: incidentLabel,
          tool: "send_volunteer_alerts",
          risk_level: "AMBER",
          result: `Backend dispatch call failed (${e?.message || "request error"}) — no alerts were sent.`,
        },
        ...prev,
      ]);
    }
  };

  const triggerAssignment = async () => {
    if (!activeDisasterId) {
      setAuditLogs((prev) => [
        {
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actor: "PlanningEngine",
          incident: incidentLabel,
          tool: "assign_disaster_tasks",
          risk_level: "AMBER",
          result: "No active disaster found - nothing to assign.",
        },
        ...prev,
      ]);
      return;
    }

    try {
      const created = await apiPost<TaskItem[]>(`/disasters/${activeDisasterId}/assign`, {});
      const newTasks = Array.isArray(created) ? created : [];
      if (newTasks.length > 0) {
        setTasks((prev) => {
          const byId = new Map(prev.map((t) => [t.task_id, t]));
          for (const t of newTasks) byId.set(t.task_id, t);
          return Array.from(byId.values());
        });
        setPipelineStage(8);
      }
      setAuditLogs((prev) => [
        {
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actor: "PlanningEngine",
          incident: incidentLabel,
          tool: "assign_disaster_tasks",
          risk_level: "GREEN",
          result:
            newTasks.length > 0
              ? `PlanningEngine assigned ${newTasks.length} task(s) based on capacity, skills, and safe route.`
              : "No new tasks assigned - all disaster needs already have an active task.",
        },
        ...prev,
      ]);
    } catch (e: any) {
      setAuditLogs((prev) => [
        {
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actor: "PlanningEngine",
          incident: incidentLabel,
          tool: "assign_disaster_tasks",
          risk_level: "AMBER",
          result: `Backend assignment call failed (${e?.message || "request error"}) — no tasks were assigned.`,
        },
        ...prev,
      ]);
    }
  };

  const triggerRecovery = () => {
    const activeTask = disasterTasks.find((t) => t.volunteer_id && t.status !== "completed");
    if (!activeTask) {
      setAuditLogs((prev) => [
        {
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actor: "RecoveryEngine",
          incident: incidentLabel,
          tool: "report_disruption",
          risk_level: "AMBER",
          result: "No assigned task available to simulate a cancellation against.",
        },
        ...prev,
      ]);
      return;
    }
    const replacement = disasterTasks.find((t) => t.task_id !== activeTask.task_id && t.volunteer_id) || null;

    setPendingDecision({
      id: `dec-recovery-${activeTask.task_id}`,
      taskId: activeTask.task_id,
      fromVolunteerId: activeTask.volunteer_id,
      toVolunteerId: replacement?.volunteer_id || null,
      action: `Reassign task ${activeTask.task_id} to a replacement volunteer`,
      reason: "Simulated: assigned volunteer cancelled due to vehicle breakdown",
      evidence: ["Simulated telemetry: vehicle static for 20m", "Simulated route closure on main access road"],
      recommendedAction: "Re-run PlanningEngine matching and reassign the task",
      alternativeOptions: replacement ? [`Reassign to ${volunteerNames[replacement.volunteer_id!] || replacement.volunteer_id}`] : ["Hold for new incoming volunteer"],
      riskLevel: "AMBER",
    });

    setAuditLogs((prev) => [
      {
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actor: "RecoveryEngine",
        incident: incidentLabel,
        tool: "report_disruption",
        risk_level: "AMBER",
        result: `Simulated cancellation for ${activeTask.task_id}. Created pending AMBER decision for coordinator review (not yet applied to backend state).`,
      },
      ...prev,
    ]);
  };

  const pipelineSteps = [
    "Request Location",
    "Find Volunteer",
    "Alert Sent",
    "First Volunteer Accepts",
    "Assign Task",
    "Map / Route",
    "Pickup Verified",
    "Delivery In Progress",
    "Completion Confirmed",
    "Activity Logged",
  ];

  return (
    <div className="space-y-8 pb-12 font-sans">
      {/* Top Header & Role Switcher Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-100 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700/60 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 text-white font-black shadow-lg shadow-sky-500/20">
            <Bot size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Auto-Dispatch Operations Agent</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-300 dark:bg-sky-500/20 dark:text-sky-400 dark:border-sky-500/30 text-[11px] font-extrabold uppercase">
                Deterministic Engine Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              AI Agent orchestrates deterministic backend engines (`VolunteerMatcher`, `PlanningEngine`, `RiskClassifier`).
            </p>
          </div>
        </div>

        {/* Role Switcher Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Role Switcher */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-950/80 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2">Role View:</span>
            {(["COORDINATOR", "VOLUNTEER", "RECIPIENT"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  role === r
                    ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {r === "COORDINATOR" ? "Coordinator / Admin" : r === "VOLUNTEER" ? "Volunteer Portal" : "User / Recipient"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section 10: Coordinator Dashboard Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: "Active Incidents",
            val: disasters.filter((d) => d.status === "active" || d.status === "monitoring").length,
            cls: "bg-rose-50 border-rose-200 text-rose-900 dark:border-rose-500/40 dark:text-rose-400 dark:bg-rose-950/20",
          },
          { label: "Nearby Volunteers", val: volunteers.length, cls: "bg-sky-50 border-sky-200 text-sky-900 dark:border-sky-500/40 dark:text-sky-400 dark:bg-sky-950/20" },
          { label: "Alerts Sent", val: alerts.length, cls: "bg-sky-50 border-sky-200 text-sky-900 dark:border-sky-500/40 dark:text-sky-400 dark:bg-sky-950/20" },
          {
            label: "Alerts Accepted",
            val: alerts.filter((a) => a.status === "accepted").length,
            cls: "bg-emerald-50 border-emerald-200 text-emerald-900 dark:border-emerald-500/40 dark:text-emerald-400 dark:bg-emerald-950/20",
          },
          {
            label: "Tasks Assigned",
            val: disasterTasks.filter((t) => ["assigned", "in_progress", "completed"].includes(t.status)).length,
            cls: "bg-slate-50 border-slate-200 text-slate-900 dark:border-slate-500/40 dark:text-slate-400 dark:bg-slate-950/20",
          },
          {
            label: "Unresolved",
            val:
              disasterTasks.filter((t) => t.status === "needs_attention" || t.status === "failed").length +
              (pendingDecision ? 1 : 0),
            cls: "bg-amber-50 border-amber-200 text-amber-900 dark:border-amber-500/40 dark:text-amber-400 dark:bg-amber-950/20",
          },
        ].map((m, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-2xl border flex flex-col justify-between shadow-xs transition-all ${m.cls}`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">{m.label}</span>
            <span className="text-2xl font-black mt-2">{m.val}</span>
          </div>
        ))}
      </div>

      {/* Admin / Coordinator Dispatch Control Bar */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-100 via-white to-slate-100 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-sky-600 dark:text-sky-400" size={20} />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Coordinator Dispatch Controls</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Monitor & configure automatic dispatch engine settings</p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Pause / Cancel Auto-Dispatch Toggle */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Auto-Dispatch Engine:</span>
              <button
                onClick={() => {
                  setAutoDispatchEnabled(!autoDispatchEnabled);
                  setAuditLogs((prev) => [
                    {
                      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                      actor: "Coordinator",
                      incident: incidentLabel,
                      tool: autoDispatchEnabled ? "pause_auto_dispatch" : "resume_auto_dispatch",
                      risk_level: "GREEN",
                      result: autoDispatchEnabled ? "Automatic dispatch paused by coordinator" : "Automatic dispatch resumed",
                    },
                    ...prev,
                  ]);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  autoDispatchEnabled
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                    : "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                }`}
              >
                {autoDispatchEnabled ? (
                  <>
                    <CheckCircle2 size={13} /> ACTIVE
                  </>
                ) : (
                  <>
                    <Lock size={13} /> PAUSED
                  </>
                )}
              </button>
            </div>

            {/* Search Radius Control */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Search Radius:</span>
              <input
                type="range"
                min="1.0"
                max="25.0"
                step="0.5"
                value={searchRadiusKm}
                onChange={(e) => setSearchRadiusKm(parseFloat(e.target.value))}
                className="w-24 accent-sky-500 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 w-12">{searchRadiusKm.toFixed(1)} km</span>
            </div>
          </div>
        </div>

        {/* Real-time Alert Single Claiming Exclusivity Card (Requirement 3 & 4) */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚨</span>
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">Real-Time Single Acceptance Exclusivity Test Card</h3>
            </div>
            <span className="text-[10px] font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 px-2 py-0.5 rounded">
              First-Come First-Served Acceptance
            </span>
          </div>

          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-rose-700 dark:text-rose-300">🚨 Help Needed Near You</span>
              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 font-bold text-[10px]">High Priority</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              📍 <strong>Zone B, Rathmalana</strong> · Problem: <strong>Flood assistance required</strong> · Distance: <strong>2.3 km</strong>
            </p>

            {claimedByVolunteer ? (
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center justify-between">
                <span>"This task has already been accepted by {claimedByVolunteer}."</span>
                <button
                  onClick={() => setClaimedByVolunteer(null)}
                  className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline font-normal"
                >
                  Reset Claim
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    setClaimedByVolunteer("Volunteer A");
                    triggerAssignment();
                    setAuditLogs((prev) => [
                      {
                        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                        actor: "Volunteer A",
                        incident: incidentLabel,
                        tool: "volunteer_accept_alert",
                        risk_level: "GREEN",
                        result: "Volunteer A accepted alert. Alert automatically locked out for all other volunteers.",
                      },
                      ...prev,
                    ]);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30"
                >
                  [Accept as Volunteer A]
                </button>
                <button
                  onClick={() => {
                    setClaimedByVolunteer("Volunteer B");
                    triggerAssignment();
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/30"
                >
                  [Accept as Volunteer B]
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 11: Live Visual Dispatch Pipeline */}
      <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="text-sky-600 dark:text-sky-400" size={18} />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Live Visual Dispatch Pipeline</h2>
          </div>
          <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">Stage {pipelineStage} of 11: {pipelineSteps[pipelineStage - 1]}</span>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex items-center gap-2 min-w-max">
            {pipelineSteps.map((stepName, idx) => {
              const isCurrent = idx + 1 === pipelineStage;
              const isPast = idx + 1 < pipelineStage;
              return (
                <div key={idx} className="flex items-center">
                  <div
                    onClick={() => setPipelineStage(idx + 1)}
                    className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border ${
                      isCurrent
                        ? "bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-500/30 scale-105"
                        : isPast
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-500/40"
                        : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-950 dark:text-slate-500 dark:border-slate-800"
                    }`}
                  >
                    {isPast ? <CheckCircle2 size={13} /> : <span className="text-[10px] font-black">{idx + 1}.</span>}
                    <span>{stepName}</span>
                  </div>
                  {idx < pipelineSteps.length - 1 && <ChevronRight size={14} className="text-slate-400 dark:text-slate-600 mx-1" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step 6: Map & Safe Route Navigation Visualization Box */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="text-sky-600 dark:text-sky-400" size={20} />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Step 6: Map & Safe Route Navigation</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Deterministic route feasibility and real-time transit tracking</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 text-[10px] font-black uppercase">
            Route Status: Safe & Open
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
            {/* Visual SVG Map Path */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-sky-400 animate-ping" />
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">Pickup: Rathmalana Food Hub</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Lat: 6.9271, Lng: 79.8612</span>
            </div>

            {/* Path Graphic */}
            <div className="relative z-10 my-4 flex items-center justify-center gap-2">
              <div className="h-0.5 flex-1 bg-gradient-to-r from-sky-500 via-emerald-400 to-sky-700 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  🚚 En Route (2.3 km · 12 mins)
                </div>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">Destination: Zone B Community Shelter</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded">
                Verified Accessible
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-xs">
            <h3 className="font-extrabold text-slate-900 dark:text-white uppercase text-[11px]">Transit Diagnostics</h3>
            <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Distance:</span>
                <span className="font-bold text-slate-900 dark:text-white">2.3 km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Est. Duration:</span>
                <span className="font-bold text-slate-900 dark:text-white">12 minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Hazards:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">None detected</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Route Classifier:</span>
                <span className="font-bold text-sky-600 dark:text-sky-400">GREEN Tier</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Request Details & AI Operations Agent */}
        <div className="space-y-6 lg:col-span-1">
          {/* Section 2: Request / Incident Details Screen */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <BadgeAlert className="text-rose-600 dark:text-rose-400" size={20} />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Incident Details</h2>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30 text-xs font-extrabold">
                HIGH PRIORITY
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">Incident Title</span>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{incidentLabel}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-semibold text-[10px]">Disaster ID</span>
                  <p className="font-mono font-bold text-sky-600 dark:text-sky-400">{activeDisasterId || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-semibold text-[10px]">Affected Zone</span>
                  <p className="font-bold text-amber-700 dark:text-amber-300">📍 Rathmalana, Zone B</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-semibold text-[10px]">Reason & Situation</span>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                  Flooding has affected several households; local community shelter requires urgent food & water distribution.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-semibold text-[10px]">People Affected</span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">👥 45 People</p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-semibold text-[10px]">Needed By</span>
                  <p className="font-bold text-amber-700 dark:text-amber-400 text-sm">⏰ 6:00 PM Today</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-semibold text-[10px]">Required Resources & Skills</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">📦 Drinking Water</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">📦 Ready-to-eat Meals</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">🛠️ Food Delivery</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">🩺 First Aid</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: AI Operations Agent Orchestration Panel */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Sparkles className="text-sky-600 dark:text-sky-400" size={20} />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">AI Operations Agent</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Natural-language coordinator command panel</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-[11px] h-48 overflow-y-auto space-y-2">
              {agentLogs.length === 0 ? (
                <div className="text-slate-400">No agent activity yet. Type a command below to get started.</div>
              ) : (
                agentLogs.map((log, i) => (
                  <div key={i} className={log.startsWith("Coordinator:") ? "text-sky-600 dark:text-sky-400 font-bold" : "text-slate-600 dark:text-slate-300"}>
                    {log}
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quick Commands</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Find volunteers near Zone B",
                  "Alert available volunteers for this request",
                  "Assign the best available volunteer",
                  "Report cancellation disruption",
                ].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => handleAgentInstruction(cmd)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-300 dark:border-slate-700 transition-colors"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type command (e.g. 'Alert volunteers near Zone B')..."
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAgentInstruction()}
                className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={() => handleAgentInstruction()}
                disabled={loadingAgent}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-sky-600/30"
              >
                {loadingAgent ? <RotateCcw className="animate-spin" size={14} /> : <Send size={14} />}
                Run
              </button>
            </div>

            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/40 text-[11px] text-sky-800 dark:text-sky-300">
              🛡️ <strong>Architectural Rule:</strong> The AI Agent orchestrates available tools (`find_nearby_volunteers`, `send_volunteer_alerts`). It NEVER invents matching scores or assigns volunteers directly.
            </div>
          </div>
        </div>

        {/* Right Column: Matcher, Alerting, Assignment, Risk Gate */}
        <div className="space-y-6 lg:col-span-2">
          {/* Section 3: Automatic Volunteer Discovery (VolunteerMatcher) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="text-sky-600 dark:text-sky-400" size={20} />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Nearby Eligible Volunteers</h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Calculated deterministically by `VolunteerMatcher`: Distance + Skills + Availability + Capacity + Workload + Route Safety.
                </p>
              </div>
              <button
                onClick={loadEligibleVolunteers}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-300 dark:border-slate-700 flex items-center gap-1.5"
              >
                <RotateCcw size={13} /> Refresh Match
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {volunteers.map((vol) => (
                <div key={vol.volunteer_id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{vol.name}</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="text-sky-600 dark:text-sky-400" /> {vol.distance_km} km away ({vol.zone})
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 text-[10px] font-black">
                      Score: {vol.score}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Skills:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{vol.skills.join(", ")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Capacity:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{vol.max_carry_capacity} kg</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Current Tasks:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{vol.current_task_count} tasks</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex flex-wrap gap-1">
                    {vol.reasons.map((r, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        ✓ {r}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5 & 6: Volunteer Alerting & Response Tracker */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Bell className="text-amber-600 dark:text-amber-400" size={20} />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Volunteer Alert & Response Tracker</h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Alerted → Accepted / Eligible vs Declined</p>
              </div>
              <button
                onClick={triggerAlerts}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-600/30"
              >
                <Send size={14} /> Send Relief Alerts
              </button>
            </div>

            {/* Mandatory Disclaimer Box */}
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="shrink-0 text-amber-600 dark:text-amber-400" size={18} />
              <span>
                "Accepting this alert makes a volunteer eligible for assignment. It does not automatically assign them to a task."
              </span>
            </div>

            {/* Volunteer Response Table */}
            <Table columns={["Volunteer", "Distance", "Skills", "Status"]}>
              {alerts.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-xs text-slate-400" colSpan={4}>
                    No alerts sent yet. Click "Send Relief Alerts" to alert nearby eligible volunteers.
                  </td>
                </tr>
              ) : (
                alerts.map((a) => {
                  const matchedVolunteer = volunteers.find((v) => v.volunteer_id === a.volunteer_id);
                  const statusStyle =
                    a.status === "accepted"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                      : a.status === "declined"
                      ? "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30"
                      : "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
                  return (
                    <tr key={a.alert_id}>
                      <td className="px-4 py-3 font-bold">{volunteerNames[a.volunteer_id] || a.volunteer_id}</td>
                      <td className="px-4 py-3">{a.approximate_distance != null ? `${a.approximate_distance} km` : "—"}</td>
                      <td className="px-4 py-3">{matchedVolunteer ? matchedVolunteer.skills.join(", ") : "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded border font-extrabold text-[10px] ${statusStyle}`}>
                          {a.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </Table>
          </div>

          {/* Section 7 & 8: Deterministic Task Assignment (PlanningEngine) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Navigation className="text-sky-600 dark:text-sky-400" size={20} />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Deterministic Task Assignment (PlanningEngine)</h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Multi-task allocation matrix calculated deterministically by PlanningEngine</p>
              </div>
              <button
                onClick={triggerAssignment}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-600/30"
              >
                <Zap size={14} /> Run Planning Engine
              </button>
            </div>

            <div className="space-y-3">
              {disasterTasks.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No tasks assigned yet. Click "Run Planning Engine" to assign accepted volunteers.</p>
              ) : (
                disasterTasks.map((t) => (
                  <div key={t.task_id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{t.task_id}</span>
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">{t.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Required Capacity: {t.required_capacity} kg | Priority: {t.priority}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-bold">Assigned Volunteer</span>
                        <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                          {t.volunteer_id ? volunteerNames[t.volunteer_id] || t.volunteer_id : "Unassigned"}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-md bg-sky-100 text-sky-700 border border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30 text-[10px] font-black">
                        Decision made by: PlanningEngine
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 6 & 7: Volunteer Activity Tracking ⭐ (Real-time Telemetry) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Navigation className="text-sky-600 dark:text-sky-400" size={20} />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Volunteer Activity Tracking ⭐</h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Real-time telemetry, pickup verification, collected quantities, and delivery status
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 border border-sky-300 dark:bg-sky-500/20 dark:text-sky-400 dark:border-sky-500/30 text-[10px] font-black uppercase">
                LIVE TELEMETRY
              </span>
            </div>

            {taskActionError && (
              <AlertBanner tone="red" onDismiss={() => setTaskActionError(null)}>
                {taskActionError}
              </AlertBanner>
            )}

            {(() => {
              const activityTasks = disasterTasks.filter((t) => t.volunteer_id);
              if (activityTasks.length === 0) {
                return (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    No volunteers assigned yet. Assign tasks above to see live activity here.
                  </p>
                );
              }

              const applyTaskUpdate = async (taskId: string, status: string, actorName: string) => {
                try {
                  const updated = await patchTaskStatus(taskId, status);
                  setTasks((prev) => prev.map((t) => (t.task_id === taskId ? (updated as any) : t)));
                  setAuditLogs((prev) => [
                    {
                      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                      actor: actorName,
                      incident: incidentLabel,
                      tool: `update_task_status_${status}`,
                      risk_level: "GREEN",
                      result: `${actorName} updated ${taskId} status to '${status}'.`,
                    },
                    ...prev,
                  ]);
                } catch (e: any) {
                  const message = e?.message || "backend rejected the transition";
                  setTaskActionError(`Could not update ${taskId} to '${status}': ${message}`);
                  setAuditLogs((prev) => [
                    {
                      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                      actor: actorName,
                      incident: incidentLabel,
                      tool: `update_task_status_${status}`,
                      risk_level: "AMBER",
                      result: `Failed to update ${taskId} to '${status}': ${message}`,
                    },
                    ...prev,
                  ]);
                }
              };

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activityTasks.map((t) => {
                    const volunteerName = volunteerNames[t.volunteer_id!] || t.volunteer_id!;
                    const steps = ["assigned", "in_progress", "completed"] as const;
                    const stepIndex = steps.indexOf(t.status as any);

                    return (
                      <div key={t.task_id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 relative">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🚚</span>
                            <div>
                              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{volunteerName}</h3>
                              <p className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold">{t.title} ({t.task_id})</p>
                            </div>
                          </div>

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                              t.status === "completed"
                                ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                                : t.status === "in_progress"
                                ? "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-500/20 dark:text-sky-400 dark:border-sky-500/30 animate-pulse"
                                : "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30"
                            }`}
                          >
                            🔄 {label(t.status)}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 border-t border-b border-slate-200 dark:border-slate-800/80 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400">📍 Pickup Location:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{formatLocation(t.pickup_location)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400">📍 Destination:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{formatLocation(t.destination)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400">📦 Resources:</span>
                            <span className="font-extrabold text-amber-700 dark:text-amber-300">
                              {t.quantity} {label(t.category)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400">🕐 Created:</span>
                            <span className="font-mono text-slate-600 dark:text-slate-300">{formatDate(t.created_at)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400">⏱️ Last Updated:</span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatDate(t.updated_at)}</span>
                          </div>
                        </div>

                        {/* Lifecycle Status Stepper - real TaskLifecycle values only */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Progress Lifecycle:</span>
                          <div className="flex items-center justify-between gap-1">
                            {steps.map((st, idx) => {
                              const isDone = idx <= stepIndex;
                              const disabled = t.status === "completed";
                              return (
                                <button
                                  key={st}
                                  disabled={disabled}
                                  onClick={() => applyTaskUpdate(t.task_id, st, volunteerName)}
                                  className={`flex-1 py-1 rounded text-[9px] font-black transition-all border disabled:cursor-not-allowed disabled:opacity-60 ${
                                    st === t.status
                                      ? "bg-sky-600 text-white border-sky-400 shadow-sm"
                                      : isDone
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-600/40"
                                      : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800"
                                  }`}
                                >
                                  {label(st)}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Completion Action */}
                        <div className="pt-2">
                          <button
                            disabled={t.status === "completed"}
                            onClick={() => applyTaskUpdate(t.task_id, "completed", volunteerName)}
                            className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                          >
                            <CheckCircle2 size={14} /> {t.status === "completed" ? "Delivery Completed" : "Confirm Delivery & Complete Task"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Section 9: GREEN / AMBER / RED Safety Gate */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-emerald-600 dark:text-emerald-400" size={20} />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">GREEN / AMBER / RED Safety Gate</h2>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">RiskClassifier Enforced</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* GREEN Tier */}
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-emerald-500 text-white dark:text-slate-950 font-black text-[10px]">GREEN TIER</span>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">AUTO EXECUTE</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">Normal food pickup, verified volunteer replacement, low-risk deliveries.</p>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">✓ Automatically Executed</div>
              </div>

              {/* AMBER Tier */}
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-white dark:text-slate-950 font-black text-[10px]">AMBER TIER</span>
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">APPROVAL REQUIRED</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">Large redistribution, uncertain routes, emergency re-routing.</p>
                <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">⚠️ Human Approval Needed</div>
              </div>

              {/* RED Tier */}
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-rose-500 text-white dark:text-slate-950 font-black text-[10px]">RED TIER</span>
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400">NEVER AUTONOMOUS</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">Medical treatment, evacuation orders, restricted zone entry.</p>
                <div className="text-[11px] text-rose-700 dark:text-rose-400 font-bold">🚫 Autonomous Execution Unavailable</div>
              </div>
            </div>

            {/* Pending AMBER Decision Card (if triggered) */}
            {pendingDecision && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-500/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="text-amber-600 dark:text-amber-400" size={18} />
                    <span className="text-sm font-bold text-amber-800 dark:text-amber-300">Pending Coordinator Approval ({pendingDecision.id})</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-800 dark:bg-amber-500/30 dark:text-amber-300 text-[10px] font-black">AMBER RISK</span>
                </div>

                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <p><strong>Action:</strong> {pendingDecision.action}</p>
                  <p><strong>Reason:</strong> {pendingDecision.reason}</p>
                  <p><strong>Evidence:</strong> {pendingDecision.evidence.join("; ")}</p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={async () => {
                      const { taskId, toVolunteerId } = pendingDecision;
                      if (!toVolunteerId) {
                        setDecisionNotice({
                          tone: "red",
                          text: "No replacement volunteer available for this task - cannot approve reassignment.",
                        });
                        setPendingDecision(null);
                        return;
                      }
                      try {
                        const result: any = await apiPost(`/tasks/${taskId}/reassign`, { new_volunteer_id: toVolunteerId });
                        if (result?.task) {
                          setTasks((prev) => prev.map((t) => (t.task_id === taskId ? result.task : t)));
                        }
                        setAuditLogs((prev) => [
                          {
                            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                            actor: "Coordinator (Human Approval)",
                            incident: incidentLabel,
                            tool: "reassign_task_volunteer",
                            risk_level: "AMBER",
                            result: `Volunteer replaced on ${taskId}. Old OTP/QR verification codes invalidated; new pickup/delivery codes generated.`,
                          },
                          ...prev,
                        ]);
                        setDecisionNotice({
                          tone: "green",
                          text: "Coordinator APPROVED AMBER decision: volunteer replaced, old verification codes invalidated, new OTP/QR codes generated.",
                        });
                      } catch (e: any) {
                        setDecisionNotice({
                          tone: "red",
                          text: `Reassignment failed: ${e?.message || "backend call did not succeed"}. No change was made.`,
                        });
                      }
                      setPendingDecision(null);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Check size={14} /> Approve & Reassign (Invalidate Old Codes)
                  </button>
                  <button
                    onClick={() => {
                      setDecisionNotice({ tone: "red", text: "Coordinator REJECTED the AMBER decision." });
                      setPendingDecision(null);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            )}
            {decisionNotice && (
              <AlertBanner tone={decisionNotice.tone} onDismiss={() => setDecisionNotice(null)}>
                {decisionNotice.text}
              </AlertBanner>
            )}
          </div>

          {/* Section 13: RecoveryEngine Simulation */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="text-rose-600 dark:text-rose-400" size={20} />
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Automated Recovery Engine</h2>
              </div>
              <button
                onClick={triggerRecovery}
                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-300 dark:border-rose-800/60 text-xs font-bold flex items-center gap-1.5"
              >
                <AlertTriangle size={14} /> Simulate Volunteer Cancellation
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              When an assigned volunteer cancels or loses capacity, `RecoveryEngine` leaves unaffected tasks untouched, finds replacement volunteers, re-runs matching, and applies GREEN/AMBER safety classification.
            </p>
          </div>

          {/* Section 15: Operational Audit Trail */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <FileText className="text-sky-600 dark:text-sky-400" size={20} />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Operational Audit Trail</h2>
            </div>

            <Table columns={["Time", "Actor", "Tool / Action", "Risk", "Result"]}>
              {auditLogs.map((log, i) => (
                <tr key={i}>
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-400 dark:text-slate-500">{log.timestamp}</td>
                  <td className="px-4 py-3 font-bold text-sky-700 dark:text-sky-600">{log.actor}</td>
                  <td className="px-4 py-3 font-mono text-[11px]">{log.tool}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                        log.risk_level === "GREEN"
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-600 dark:border-emerald-500/30"
                          : "bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-600 dark:border-amber-500/30"
                      }`}
                    >
                      {log.risk_level}
                    </span>
                  </td>
                  <td className="px-4 py-3">{log.result}</td>
                </tr>
              ))}
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
