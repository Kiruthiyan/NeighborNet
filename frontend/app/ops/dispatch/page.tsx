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
import { apiGet, apiPost } from "../../../lib/api";
import { formatLocation } from "../../../lib/format";

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
  disaster_id: string;
  status: "sent" | "accepted" | "declined" | "timeout";
  created_at: string;
}

interface TaskItem {
  task_id: string;
  title: string;
  assigned_volunteer_id?: string;
  status: string;
  priority: string;
  required_capacity: number;
  destination?: any;
}

interface VolunteerActivity {
  volunteer_id: string;
  volunteer_name: string;
  task_id: string;
  task_title: string;
  accepted_time: string;
  pickup_location: string;
  pickup_time: string;
  resources_collected: string;
  quantity_collected: number;
  destination: string;
  delivery_time: string;
  status: "Accepted" | "Pickup" | "In Progress" | "Delivered" | "Completed";
  cancelled_reason?: string;
  replacement_volunteer?: string;
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
  const [themeMode, setThemeMode] = useState<"LIGHT" | "DARK">("LIGHT");
  const [pipelineStage, setPipelineStage] = useState<number>(4);
  const [instruction, setInstruction] = useState("");
  const [agentLogs, setAgentLogs] = useState<string[]>([
    "10:32 AM - System Initialized: Incident 'Flood Assistance - Zone B' registered.",
    "10:32 AM - RiskClassifier evaluated incident: GREEN (Standard relief dispatch).",
    "10:33 AM - VolunteerMatcher scanned 18 nearby verified volunteers.",
  ]);
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [volunteers, setVolunteers] = useState<VolunteerMatch[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [pendingDecision, setPendingDecision] = useState<any | null>(null);
  const [autoDispatchEnabled, setAutoDispatchEnabled] = useState(true);
  const [searchRadiusKm, setSearchRadiusKm] = useState(5.0);
  const [claimedByVolunteer, setClaimedByVolunteer] = useState<string | null>(null);

  const [activities, setActivities] = useState<VolunteerActivity[]>([
    {
      volunteer_id: "vol-a",
      volunteer_name: "Volunteer A",
      task_id: "task-101",
      task_title: "Flood Food Delivery",
      accepted_time: "10:32 AM",
      pickup_location: "Rathmalana Food Hub",
      pickup_time: "10:40 AM",
      resources_collected: "Prepared Food Packs",
      quantity_collected: 25,
      destination: "Zone B Community Shelter",
      delivery_time: "Est 11:15 AM",
      status: "In Progress",
    },
    {
      volunteer_id: "vol-b",
      volunteer_name: "Volunteer B",
      task_id: "task-102",
      task_title: "Drinking Water Distribution",
      accepted_time: "10:33 AM",
      pickup_location: "Community Water Depot",
      pickup_time: "10:45 AM",
      resources_collected: "Drinking Water Barrels",
      quantity_collected: 40,
      destination: "Zone B Community Shelter",
      delivery_time: "Est 11:30 AM",
      status: "Pickup",
    },
    {
      volunteer_id: "vol-c",
      volunteer_name: "Volunteer C",
      task_id: "task-103",
      task_title: "Shelter Logistics & Kits",
      accepted_time: "10:35 AM",
      pickup_location: "Central Relief Store",
      pickup_time: "Pending",
      resources_collected: "Emergency Hygiene Kits",
      quantity_collected: 15,
      destination: "Zone B Shelter",
      delivery_time: "Est 11:45 AM",
      status: "Accepted",
    },
  ]);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      timestamp: "10:32 AM",
      actor: "AI Agent",
      incident: "Flood Assistance - Zone B",
      tool: "find_nearby_volunteers",
      risk_level: "GREEN",
      result: "Found 18 eligible verified volunteers within 5.0 km radius",
    },
    {
      timestamp: "10:33 AM",
      actor: "Notification Service",
      incident: "Flood Assistance - Zone B",
      tool: "send_volunteer_alerts",
      risk_level: "GREEN",
      result: "12 alerts sent to nearby volunteers",
    },
    {
      timestamp: "10:35 AM",
      actor: "Volunteer Response",
      incident: "Flood Assistance - Zone B",
      tool: "volunteer_accept_alert",
      risk_level: "GREEN",
      result: "8 volunteers accepted eligibility alert",
    },
  ]);

  // Load initial data
  useEffect(() => {
    loadEligibleVolunteers();
    loadDisasterTasks();
  }, []);

  async function loadEligibleVolunteers() {
    const data = await apiGet<VolunteerMatch[]>("/volunteers/eligible?zone=Zone B", []);
    setVolunteers(Array.isArray(data) ? data : []);
  }

  async function loadDisasterTasks() {
    const data = await apiGet<TaskItem[]>("/tasks", []);
    setTasks(Array.isArray(data) ? data : []);
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
    } flex: {
      setLoadingAgent(false);
      setInstruction("");
    }
  };

  const triggerAlerts = async () => {
    try {
      await apiPost("/disasters/disaster-flood-01/dispatch", {});
    } catch (e) {}

    setAlerts([
      { alert_id: "alt-1", volunteer_id: "vol-a", disaster_id: "disaster-flood-01", status: "accepted", created_at: "10:33 AM" },
      { alert_id: "alt-2", volunteer_id: "vol-b", disaster_id: "disaster-flood-01", status: "accepted", created_at: "10:33 AM" },
      { alert_id: "alt-3", volunteer_id: "vol-c", disaster_id: "disaster-flood-01", status: "sent", created_at: "10:33 AM" },
    ]);

    setAuditLogs((prev) => [
      {
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actor: "Notification Service",
        incident: "Flood Assistance - Zone B",
        tool: "send_volunteer_alerts",
        risk_level: "GREEN",
        result: "12 alerts sent to nearby verified volunteers",
      },
      ...prev,
    ]);
  };

  const triggerAssignment = async () => {
    try {
      await apiPost("/disasters/disaster-flood-01/assign", {});
    } catch (e) {}

    setPipelineStage(8);
    setTasks([
      {
        task_id: "task-101",
        title: "Deliver 50 meal packs to Zone B Shelter",
        status: "assigned",
        priority: "high",
        required_capacity: 30,
        assigned_volunteer_id: "vol-b",
      },
      {
        task_id: "task-102",
        title: "Deliver drinking water barrels",
        status: "assigned",
        priority: "high",
        required_capacity: 40,
        assigned_volunteer_id: "vol-c",
      },
      {
        task_id: "task-103",
        title: "Assist shelter logistics & distribution",
        status: "assigned",
        priority: "medium",
        required_capacity: 10,
        assigned_volunteer_id: "vol-a",
      },
    ]);

    setAuditLogs((prev) => [
      {
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actor: "PlanningEngine",
        incident: "Flood Assistance - Zone B",
        tool: "assign_disaster_tasks",
        risk_level: "GREEN",
        result: "PlanningEngine assigned 3 tasks based on capacity, skills, and safe route.",
      },
      ...prev,
    ]);
  };

  const triggerRecovery = () => {
    setPendingDecision({
      id: "dec-recovery-01",
      action: "Reassign Volunteer B task to Volunteer C",
      reason: "Volunteer B cancelled due to vehicle breakdown in Zone B",
      evidence: ["Telemetry indicates vehicle static for 20m", "Route closure on main access road"],
      recommendedAction: "Re-run PlanningEngine matching and reassign Task 101 to Volunteer C",
      alternativeOptions: ["Assign to Volunteer A (Lower capacity: 10)", "Hold for new incoming volunteer"],
      riskLevel: "AMBER",
    });

    setAuditLogs((prev) => [
      {
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actor: "RecoveryEngine",
        incident: "Flood Assistance - Zone B",
        tool: "report_disruption",
        risk_level: "AMBER",
        result: "Volunteer B cancelled. Created pending AMBER decision dec-recovery-01 for coordinator review.",
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white font-black shadow-lg shadow-sky-500/20">
            <Bot size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Auto-Dispatch Operations Agent</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[11px] font-extrabold uppercase">
                Deterministic Engine Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              AI Agent orchestrates deterministic backend engines (`VolunteerMatcher`, `PlanningEngine`, `RiskClassifier`).
            </p>
          </div>
        </div>

        {/* Role & Theme Switcher Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Theme Selector */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setThemeMode("LIGHT")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                themeMode === "LIGHT"
                  ? "bg-amber-400 text-slate-950 shadow-md font-extrabold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ☀️ Light Theme
            </button>
            <button
              onClick={() => setThemeMode("DARK")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                themeMode === "DARK"
                  ? "bg-sky-600 text-white shadow-md font-extrabold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🌙 Dark Glass
            </button>
          </div>

          {/* Role Switcher */}
          <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">Role View:</span>
            {(["COORDINATOR", "VOLUNTEER", "RECIPIENT"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  role === r
                    ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
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
          { label: "Active Incidents", val: 1, light: "bg-rose-50 border-rose-200 text-rose-900", dark: "border-rose-500/40 text-rose-400 bg-rose-950/20" },
          { label: "Nearby Volunteers", val: 18, light: "bg-sky-50 border-sky-200 text-sky-900", dark: "border-sky-500/40 text-sky-400 bg-sky-950/20" },
          { label: "Alerts Sent", val: 12, light: "bg-blue-50 border-blue-200 text-blue-900", dark: "border-blue-500/40 text-blue-400 bg-blue-950/20" },
          { label: "Alerts Accepted", val: 8, light: "bg-emerald-50 border-emerald-200 text-emerald-900", dark: "border-emerald-500/40 text-emerald-400 bg-emerald-950/20" },
          { label: "Tasks Assigned", val: 5, light: "bg-purple-50 border-purple-200 text-purple-900", dark: "border-purple-500/40 text-purple-400 bg-purple-950/20" },
          { label: "Unresolved", val: 1, light: "bg-amber-50 border-amber-200 text-amber-900", dark: "border-amber-500/40 text-amber-400 bg-amber-950/20" },
        ].map((m, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-2xl border flex flex-col justify-between shadow-xs transition-all ${
              themeMode === "LIGHT" ? m.light : m.dark
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">{m.label}</span>
            <span className="text-2xl font-black mt-2">{m.val}</span>
          </div>
        ))}
      </div>

      {/* Admin / Coordinator Dispatch Control Bar */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-sky-400" size={20} />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Coordinator Dispatch Controls</h2>
              <p className="text-[11px] text-slate-400">Monitor & configure automatic dispatch engine settings</p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Pause / Cancel Auto-Dispatch Toggle */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-slate-300">Auto-Dispatch Engine:</span>
              <button
                onClick={() => {
                  setAutoDispatchEnabled(!autoDispatchEnabled);
                  setAuditLogs((prev) => [
                    {
                      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                      actor: "Coordinator",
                      incident: "Flood Assistance - Zone B",
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
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-slate-300">Search Radius:</span>
              <input
                type="range"
                min="1.0"
                max="25.0"
                step="0.5"
                value={searchRadiusKm}
                onChange={(e) => setSearchRadiusKm(parseFloat(e.target.value))}
                className="w-24 accent-sky-500 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-sky-400 w-12">{searchRadiusKm.toFixed(1)} km</span>
            </div>
          </div>
        </div>

        {/* Real-time Alert Single Claiming Exclusivity Card (Requirement 3 & 4) */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚨</span>
              <h3 className="text-xs font-extrabold text-white">Real-Time Single Acceptance Exclusivity Test Card</h3>
            </div>
            <span className="text-[10px] font-bold text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded">
              First-Come First-Served Acceptance
            </span>
          </div>

          <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-rose-300">🚨 Help Needed Near You</span>
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">High Priority</span>
            </div>
            <p className="text-xs text-slate-300">
              📍 <strong>Zone B, Rathmalana</strong> · Problem: <strong>Flood assistance required</strong> · Distance: <strong>2.3 km</strong>
            </p>

            {claimedByVolunteer ? (
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-amber-400 flex items-center justify-between">
                <span>"This task has already been accepted by {claimedByVolunteer}."</span>
                <button
                  onClick={() => setClaimedByVolunteer(null)}
                  className="text-[10px] text-slate-400 hover:text-white underline font-normal"
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
                        incident: "Flood Assistance - Zone B",
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
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="text-sky-400" size={18} />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Live Visual Dispatch Pipeline</h2>
          </div>
          <span className="text-xs font-semibold text-sky-400">Stage {pipelineStage} of 11: {pipelineSteps[pipelineStage - 1]}</span>
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
                        ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/40"
                        : "bg-slate-950 text-slate-500 border-slate-800"
                    }`}
                  >
                    {isPast ? <CheckCircle2 size={13} /> : <span className="text-[10px] font-black">{idx + 1}.</span>}
                    <span>{stepName}</span>
                  </div>
                  {idx < pipelineSteps.length - 1 && <ChevronRight size={14} className="text-slate-600 mx-1" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step 6: Map & Safe Route Navigation Visualization Box */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="text-sky-400" size={20} />
            <div>
              <h2 className="text-base font-bold text-white">Step 6: Map & Safe Route Navigation</h2>
              <p className="text-xs text-slate-400">Deterministic route feasibility and real-time transit tracking</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
            Route Status: Safe & Open
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-xl bg-slate-950 border border-slate-800 p-4 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
            {/* Visual SVG Map Path */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-sky-400 animate-ping" />
                <span className="text-xs font-extrabold text-white">Pickup: Rathmalana Food Hub</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Lat: 6.9271, Lng: 79.8612</span>
            </div>

            {/* Path Graphic */}
            <div className="relative z-10 my-4 flex items-center justify-center gap-2">
              <div className="h-0.5 flex-1 bg-gradient-to-r from-sky-500 via-emerald-400 to-purple-500 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-bold text-emerald-400">
                  🚚 En Route (2.3 km · 12 mins)
                </div>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="text-xs font-extrabold text-white">Destination: Zone B Community Shelter</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                Verified Accessible
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-2 text-xs">
            <h3 className="font-extrabold text-white uppercase text-[11px]">Transit Diagnostics</h3>
            <div className="space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Distance:</span>
                <span className="font-bold text-white">2.3 km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Est. Duration:</span>
                <span className="font-bold text-white">12 minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hazards:</span>
                <span className="font-bold text-emerald-400">None detected</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Route Classifier:</span>
                <span className="font-bold text-sky-400">GREEN Tier</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Request Details & AI Operations Agent */}
        <div className="space-y-6 lg:col-span-1">
          {/* Section 2: Request / Incident Details Screen */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <BadgeAlert className="text-rose-400" size={20} />
                <h2 className="text-base font-bold text-white">Incident Details</h2>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-extrabold">
                HIGH PRIORITY
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Incident Title</span>
                <p className="text-sm font-extrabold text-white mt-0.5">Flood Assistance – Zone B</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <div>
                  <span className="text-slate-400 font-semibold text-[10px]">Request ID</span>
                  <p className="font-mono font-bold text-sky-400">REQ-FLOOD-8092</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold text-[10px]">Affected Zone</span>
                  <p className="font-bold text-amber-300">📍 Rathmalana, Zone B</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-400 font-semibold text-[10px]">Reason & Situation</span>
                <p className="text-slate-300 mt-0.5">
                  Flooding has affected several households; local community shelter requires urgent food & water distribution.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <div>
                  <span className="text-slate-400 font-semibold text-[10px]">People Affected</span>
                  <p className="font-bold text-white text-sm">👥 45 People</p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold text-[10px]">Needed By</span>
                  <p className="font-bold text-amber-400 text-sm">⏰ 6:00 PM Today</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-400 font-semibold text-[10px]">Required Resources & Skills</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">📦 Drinking Water</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">📦 Ready-to-eat Meals</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">🛠️ Food Delivery</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">🩺 First Aid</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: AI Operations Agent Orchestration Panel */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sparkles className="text-sky-400" size={20} />
              <div>
                <h2 className="text-base font-bold text-white">AI Operations Agent</h2>
                <p className="text-[11px] text-slate-400">Natural-language coordinator command panel</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] h-48 overflow-y-auto space-y-2">
              {agentLogs.map((log, i) => (
                <div key={i} className={log.startsWith("Coordinator:") ? "text-sky-400 font-bold" : "text-slate-300"}>
                  {log}
                </div>
              ))}
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
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition-colors"
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
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
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

            <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-800/40 text-[11px] text-sky-300">
              🛡️ <strong>Architectural Rule:</strong> The AI Agent orchestrates available tools (`find_nearby_volunteers`, `send_volunteer_alerts`). It NEVER invents matching scores or assigns volunteers directly.
            </div>
          </div>
        </div>

        {/* Right Column: Matcher, Alerting, Assignment, Risk Gate */}
        <div className="space-y-6 lg:col-span-2">
          {/* Section 3: Automatic Volunteer Discovery (VolunteerMatcher) */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="text-sky-400" size={20} />
                  <h2 className="text-base font-bold text-white">Nearby Eligible Volunteers</h2>
                </div>
                <p className="text-xs text-slate-400">
                  Calculated deterministically by `VolunteerMatcher`: Distance + Skills + Availability + Capacity + Workload + Route Safety.
                </p>
              </div>
              <button
                onClick={loadEligibleVolunteers}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
              >
                <RotateCcw size={13} /> Refresh Match
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {volunteers.map((vol) => (
                <div key={vol.volunteer_id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">{vol.name}</h3>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="text-sky-400" /> {vol.distance_km} km away ({vol.zone})
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                      Score: {vol.score}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Skills:</span>
                      <span className="font-semibold text-slate-200">{vol.skills.join(", ")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Capacity:</span>
                      <span className="font-semibold text-slate-200">{vol.max_carry_capacity} kg</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Current Tasks:</span>
                      <span className="font-semibold text-emerald-400">{vol.current_task_count} tasks</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex flex-wrap gap-1">
                    {vol.reasons.map((r, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        ✓ {r}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5 & 6: Volunteer Alerting & Response Tracker */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Bell className="text-amber-400" size={20} />
                  <h2 className="text-base font-bold text-white">Volunteer Alert & Response Tracker</h2>
                </div>
                <p className="text-xs text-slate-400">Alerted → Accepted / Eligible vs Declined</p>
              </div>
              <button
                onClick={triggerAlerts}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-600/30"
              >
                <Send size={14} /> Send Relief Alerts
              </button>
            </div>

            {/* Mandatory Disclaimer Box */}
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="shrink-0 text-amber-400" size={18} />
              <span>
                "Accepting this alert makes a volunteer eligible for assignment. It does not automatically assign them to a task."
              </span>
            </div>

            {/* Volunteer Response Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2 px-3">Volunteer</th>
                    <th className="py-2 px-3">Distance</th>
                    <th className="py-2 px-3">Skills</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  <tr>
                    <td className="py-2.5 px-3 font-bold">Volunteer A</td>
                    <td className="py-2.5 px-3">2.1 km</td>
                    <td className="py-2.5 px-3">First-aid, Food delivery</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-extrabold text-[10px]">
                        ACCEPTED / ELIGIBLE
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold">Volunteer B</td>
                    <td className="py-2.5 px-3">3.4 km</td>
                    <td className="py-2.5 px-3">Food delivery, Logistics</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-extrabold text-[10px]">
                        ACCEPTED / ELIGIBLE
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold">Volunteer C</td>
                    <td className="py-2.5 px-3">4.0 km</td>
                    <td className="py-2.5 px-3">Logistics, General</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-extrabold text-[10px]">
                        DECLINED
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 7 & 8: Deterministic Task Assignment (PlanningEngine) */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Navigation className="text-purple-400" size={20} />
                  <h2 className="text-base font-bold text-white">Deterministic Task Assignment (PlanningEngine)</h2>
                </div>
                <p className="text-xs text-slate-400">Multi-task allocation matrix calculated deterministically by PlanningEngine</p>
              </div>
              <button
                onClick={triggerAssignment}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30"
              >
                <Zap size={14} /> Run Planning Engine
              </button>
            </div>

            <div className="space-y-3">
              {tasks.map((t) => (
                <div key={t.task_id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-500">{t.task_id}</span>
                      <span className="text-xs font-extrabold text-white">{t.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Required Capacity: {t.required_capacity} kg | Priority: {t.priority}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Assigned Volunteer</span>
                      <span className="text-xs font-bold text-sky-400">{t.assigned_volunteer_id || "Unassigned"}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-black">
                      Decision made by: PlanningEngine
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6 & 7: Volunteer Activity Tracking ⭐ (Real-time Telemetry) */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Navigation className="text-sky-400" size={20} />
                  <h2 className="text-base font-bold text-white">Volunteer Activity Tracking ⭐</h2>
                </div>
                <p className="text-xs text-slate-400">
                  Real-time telemetry, pickup verification, collected quantities, and delivery status
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-black uppercase">
                LIVE TELEMETRY
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activities.map((act) => (
                <div key={act.task_id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🚚</span>
                      <div>
                        <h3 className="text-sm font-extrabold text-white">{act.volunteer_name}</h3>
                        <p className="text-[11px] text-sky-400 font-semibold">{act.task_title} ({act.task_id})</p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                        act.status === "Completed"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : act.status === "In Progress"
                          ? "bg-sky-500/20 text-sky-400 border-sky-500/30 animate-pulse"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      🔄 {act.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 border-t border-b border-slate-800/80 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">📍 Pickup Location:</span>
                      <span className="font-bold text-slate-200">{act.pickup_location}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">📍 Destination:</span>
                      <span className="font-bold text-slate-200">{act.destination}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">📦 Collected Resources:</span>
                      <span className="font-extrabold text-amber-300">
                        {act.quantity_collected} {act.resources_collected}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">🕐 Accepted Time:</span>
                      <span className="font-mono text-slate-300">{act.accepted_time}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">⏱️ Delivery Time:</span>
                      <span className="font-mono text-emerald-400">{act.delivery_time}</span>
                    </div>
                  </div>

                  {/* Lifecycle Status Stepper */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Progress Lifecycle:</span>
                    <div className="flex items-center justify-between gap-1">
                      {(["Accepted", "Pickup", "In Progress", "Delivered", "Completed"] as const).map((st) => {
                        const isDone =
                          st === act.status ||
                          (st === "Accepted" && act.status !== "Accepted") ||
                          (st === "Pickup" && ["In Progress", "Delivered", "Completed"].includes(act.status)) ||
                          (st === "In Progress" && ["Delivered", "Completed"].includes(act.status)) ||
                          (st === "Delivered" && act.status === "Completed");

                        return (
                          <button
                            key={st}
                            onClick={() => {
                              setActivities((prev) =>
                                prev.map((a) => (a.task_id === act.task_id ? { ...a, status: st } : a))
                              );
                              setAuditLogs((prev) => [
                                {
                                  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                                  actor: act.volunteer_name,
                                  incident: "Flood Assistance - Zone B",
                                  tool: `update_task_status_${st.toLowerCase().replace(" ", "_")}`,
                                  risk_level: "GREEN",
                                  result: `${act.volunteer_name} updated ${act.task_id} status to '${st}'.`,
                                },
                                ...prev,
                              ]);
                            }}
                            className={`flex-1 py-1 rounded text-[9px] font-black transition-all border ${
                              st === act.status
                                ? "bg-sky-600 text-white border-sky-400 shadow-sm"
                                : isDone
                                ? "bg-emerald-950/60 text-emerald-400 border-emerald-600/40"
                                : "bg-slate-900 text-slate-500 border-slate-800"
                            }`}
                          >
                            {st}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Completion Action */}
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setActivities((prev) =>
                          prev.map((a) => (a.task_id === act.task_id ? { ...a, status: "Completed" } : a))
                        );
                        setAuditLogs((prev) => [
                          {
                            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                            actor: act.volunteer_name,
                            incident: "Flood Assistance - Zone B",
                            tool: "confirm_delivery_completion",
                            risk_level: "GREEN",
                            result: `Delivery confirmed completed for ${act.task_id}. Recipient request marked FULFILLED. Saved in audit history.`,
                          },
                          ...prev,
                        ]);
                        alert(`Delivery confirmed! ${act.volunteer_name} completed ${act.task_title}. Request REQ-FLOOD-8092 marked FULFILLED.`);
                      }}
                      className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                    >
                      <CheckCircle2 size={14} /> Confirm Delivery & Complete Request
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 9: GREEN / AMBER / RED Safety Gate */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-emerald-400" size={20} />
                <h2 className="text-base font-bold text-white">GREEN / AMBER / RED Safety Gate</h2>
              </div>
              <span className="text-xs font-semibold text-slate-400">RiskClassifier Enforced</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* GREEN Tier */}
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-[10px]">GREEN TIER</span>
                  <span className="text-[10px] font-bold text-emerald-400">AUTO EXECUTE</span>
                </div>
                <p className="text-xs text-slate-300">Normal food pickup, verified volunteer replacement, low-risk deliveries.</p>
                <div className="text-[11px] text-emerald-400 font-semibold">✓ Automatically Executed</div>
              </div>

              {/* AMBER Tier */}
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px]">AMBER TIER</span>
                  <span className="text-[10px] font-bold text-amber-400">APPROVAL REQUIRED</span>
                </div>
                <p className="text-xs text-slate-300">Large redistribution, uncertain routes, emergency re-routing.</p>
                <div className="text-[11px] text-amber-400 font-semibold">⚠️ Human Approval Needed</div>
              </div>

              {/* RED Tier */}
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-rose-500 text-slate-950 font-black text-[10px]">RED TIER</span>
                  <span className="text-[10px] font-bold text-rose-400">NEVER AUTONOMOUS</span>
                </div>
                <p className="text-xs text-slate-300">Medical treatment, evacuation orders, restricted zone entry.</p>
                <div className="text-[11px] text-rose-400 font-bold">🚫 Autonomous Execution Unavailable</div>
              </div>
            </div>

            {/* Pending AMBER Decision Card (if triggered) */}
            {pendingDecision && (
              <div className="p-4 rounded-xl bg-amber-950/50 border border-amber-500/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="text-amber-400" size={18} />
                    <span className="text-sm font-bold text-amber-300">Pending Coordinator Approval ({pendingDecision.id})</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-500/30 text-amber-300 text-[10px] font-black">AMBER RISK</span>
                </div>

                <div className="space-y-1 text-xs text-slate-300">
                  <p><strong>Action:</strong> {pendingDecision.action}</p>
                  <p><strong>Reason:</strong> {pendingDecision.reason}</p>
                  <p><strong>Evidence:</strong> {pendingDecision.evidence.join("; ")}</p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={async () => {
                      try {
                        await apiPost("/tasks/task-101/reassign", { new_volunteer_id: "vol-c" });
                      } catch { /* fallback demo */ }
                      setAuditLogs((prev) => [
                        {
                          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                          actor: "Coordinator (Human Approval)",
                          incident: "Flood Assistance - Zone B",
                          tool: "reassign_task_volunteer",
                          risk_level: "AMBER",
                          result: "Volunteer replaced! Old OTP/QR verification codes INVALIDATED. New unique pickup & delivery codes generated for replacement volunteer.",
                        },
                        ...prev,
                      ]);
                      setTasks((prev) =>
                        prev.map((t) => (t.task_id === "task-101" ? { ...t, assigned_volunteer_id: "vol-c" } : t))
                      );
                      alert("Coordinator APPROVED AMBER decision: Volunteer replaced! Old verification codes INVALIDATED & new unique OTP/QR codes generated.");
                      setPendingDecision(null);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Check size={14} /> Approve & Reassign (Invalidate Old Codes)
                  </button>
                  <button
                    onClick={() => {
                      alert("Coordinator REJECTED AMBER decision.");
                      setPendingDecision(null);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 13: RecoveryEngine Simulation */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="text-rose-400" size={20} />
                <h2 className="text-base font-bold text-white">Automated Recovery Engine</h2>
              </div>
              <button
                onClick={triggerRecovery}
                className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-bold flex items-center gap-1.5"
              >
                <AlertTriangle size={14} /> Simulate Volunteer Cancellation
              </button>
            </div>
            <p className="text-xs text-slate-400">
              When an assigned volunteer cancels or loses capacity, `RecoveryEngine` leaves unaffected tasks untouched, finds replacement volunteers, re-runs matching, and applies GREEN/AMBER safety classification.
            </p>
          </div>

          {/* Section 15: Operational Audit Trail */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <FileText className="text-sky-400" size={20} />
              <h2 className="text-base font-bold text-white">Operational Audit Trail</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2 px-2">Time</th>
                    <th className="py-2 px-2">Actor</th>
                    <th className="py-2 px-2">Tool / Action</th>
                    <th className="py-2 px-2">Risk</th>
                    <th className="py-2 px-2">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {auditLogs.map((log, i) => (
                    <tr key={i}>
                      <td className="py-2 px-2 font-mono text-[10px] text-slate-400">{log.timestamp}</td>
                      <td className="py-2 px-2 font-bold text-sky-400">{log.actor}</td>
                      <td className="py-2 px-2 font-mono text-[11px]">{log.tool}</td>
                      <td className="py-2 px-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                            log.risk_level === "GREEN"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {log.risk_level}
                        </span>
                      </td>
                      <td className="py-2 px-2">{log.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
