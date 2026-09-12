"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckSquare, AlertTriangle, ShieldCheck, Check, Truck, MapPin,
  Clock, Info, Users, Flame, Heart, Package, Zap, CheckCircle2, Lock,
  QrCode, KeyRound, Navigation, Sparkles, Radio
} from "lucide-react";
import { Panel, Table, StatusBadge, EmptyState } from "../../../components/ui";
import { apiGet, request } from "../../../lib/api";

import { VerificationModal } from "../../../components/VerificationModal";
import { TaskNavigationCard } from "../../../components/TaskNavigationCard";

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

import { formatLocation } from "../../../lib/format";

export default function CommunityVolunteerPage() {
  const [tasks, setTasks]         = useState<any[]>([]);
  const [disasters, setDisasters] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [myOpps, setMyOpps]       = useState<VolunteerOpp[]>([]);

  const [available, setAvailable] = useState(true);
  const [hasVehicle, setHasVehicle] = useState(true);
  const [skills] = useState<string[]>(["Delivery", "First Aid"]);

  // ── State for real-time automated alert flow ──
  const [alertStatus, setAlertStatus] = useState<"IDLE" | "ACCEPTED" | "DECLINED" | "CLAIMED_BY_OTHER">("IDLE");
  const [assignedTaskState, setAssignedTaskState] = useState<"NONE" | "ASSIGNED" | "PICKUP_VERIFIED" | "IN_TRANSIT" | "DELIVERED">("NONE");
  const [simulatedVolunteer, setSimulatedVolunteer] = useState<"ME" | "OTHER">("ME");

  // Automated Geofence & Verification States
  const [donorOtpInput, setDonorOtpInput] = useState("");
  const [recipientOtpInput, setRecipientOtpInput] = useState("");
  const [geofenceAtPickup, setGeofenceAtPickup] = useState(false);
  const [geofenceAtDelivery, setGeofenceAtDelivery] = useState(false);
  const [pickupVerified, setPickupVerified] = useState(false);
  const [deliveryVerified, setDeliveryVerified] = useState(false);
  const [gpsDistance, setGpsDistance] = useState(2.3);

  // Verification Modal State
  const [verModal, setVerModal] = useState<{
    isOpen: boolean;
    taskId: string;
    type: "pickup" | "delivery";
    expectedOtp?: string;
  }>({
    isOpen: false,
    taskId: "TSK-101",
    type: "pickup",
    expectedOtp: "789201",
  });

  // Sync simulated mode
  useEffect(() => {
    if (simulatedVolunteer === "OTHER") {
      setAlertStatus("CLAIMED_BY_OTHER");
    } else if (alertStatus === "CLAIMED_BY_OTHER") {
      setAlertStatus("IDLE");
    }
  }, [simulatedVolunteer]);

  // Automated GPS Travel Simulation
  useEffect(() => {
    if (assignedTaskState === "IN_TRANSIT" && gpsDistance > 0.1) {
      const timer = setInterval(() => {
        setGpsDistance((prev) => {
          if (prev <= 0.3) {
            clearInterval(timer);
            setGeofenceAtDelivery(true);
            return 0.1;
          }
          return Number((prev - 0.6).toFixed(1));
        });
      }, 1500);
      return () => clearInterval(timer);
    }
  }, [assignedTaskState, gpsDistance]);

  // Step 1: Atomic Accept ("Yes, I can help")
  const handleAcceptAlert = async () => {
    const targetTaskId = tasks.length > 0 ? (tasks[0].task_id || tasks[0].id) : "task-101";
    try {
      await request(`/tasks/${targetTaskId}/accept`, {
        method: "POST",
        body: JSON.stringify({ volunteer_id: "vol-a" }),
      });
    } catch { /* fallback for simulated UI */ }

    setAlertStatus("ACCEPTED");
    setAssignedTaskState("ASSIGNED");
    setGeofenceAtPickup(true);

    const newOpp: VolunteerOpp = {
      id: "OPP-ALERT-FLOOD",
      title: "Flood Assistance — Zone B",
      description: "Flood assistance required in Rathmalana. Urgent delivery of food & water.",
      location: "Zone B, Rathmalana",
      urgency: "HIGH",
      category: "DELIVERY",
      peopleHelped: 45,
      estimatedTime: "Needs delivery by 6:00 PM",
      claimedBy: MY_USER_ID,
      postedAt: "Just now",
    };
    const current = loadOpps();
    if (!current.some(o => o.id === newOpp.id)) {
      const updated = [newOpp, ...current];
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new Event("opp-pool-update"));
      }
    }
  };

  // Step 2: Verification at Pickup (Donor OTP / QR Scan)
  const handleVerifyPickup = async (code: string) => {
    const targetTaskId = tasks.length > 0 ? (tasks[0].task_id || tasks[0].id) : "TSK-101";
    try {
      await request(`/tasks/${targetTaskId}/verify-pickup`, {
        method: "POST",
        body: JSON.stringify({ code }),
      });
    } catch { /* graceful fallback for simulated demo UI */ }

    setPickupVerified(true);
    setAssignedTaskState("IN_TRANSIT");
    setGpsDistance(2.3);
  };

  // Step 4: Verification at Delivery (Recipient OTP / QR Scan)
  const handleVerifyDelivery = async (code: string) => {
    const targetTaskId = tasks.length > 0 ? (tasks[0].task_id || tasks[0].id) : "TSK-101";
    try {
      await request(`/tasks/${targetTaskId}/verify-delivery`, {
        method: "POST",
        body: JSON.stringify({ code }),
      });
    } catch { /* graceful fallback for simulated demo UI */ }

    setDeliveryVerified(true);
    setAssignedTaskState("DELIVERED");
  };

  const handleDeclineAlert = () => {
    setAlertStatus("DECLINED");
  };

  const handleUndoDecline = () => {
    setAlertStatus("IDLE");
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-100 text-sky-700"><CheckSquare size={22} /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Volunteer Tasks & Automated Dispatch</h1>
            <p className="text-xs text-slate-500 mt-0.5">Zero-friction automated workflow: Accept → Geofenced Verification → Auto Delivery</p>
          </div>
        </div>

        {/* Exclusivity Simulator Control */}
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
          <span className="text-[11px] font-extrabold text-slate-500 uppercase px-1">Simulate View:</span>
          <button
            onClick={() => setSimulatedVolunteer("ME")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              simulatedVolunteer === "ME"
                ? "bg-white text-emerald-700 shadow-xs border border-emerald-200 font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Volunteer 1 (Me)
          </button>
          <button
            onClick={() => setSimulatedVolunteer("OTHER")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              simulatedVolunteer === "OTHER"
                ? "bg-rose-600 text-white shadow-xs font-extrabold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Volunteer 2 (Other Accepted First)
          </button>
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

      {/* ── Accepted Opportunities (from Alerts page & localStorage) ── */}
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
            PlanningEngine verifies your profile & assigns tasks. These slots are reserved for you.
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
                    <span className="flex items-center gap-1"><MapPin size={10} />{formatLocation(opp.location)}</span>
                    <span className="flex items-center gap-1"><Clock size={10} />{opp.estimatedTime}</span>
                    <span className="flex items-center gap-1"><Users size={10} />{opp.peopleHelped} people</span>
                  </div>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-300 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  <Check size={13} /> Accepted — Eligible for Assignment
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section: Help Needed Near You (Step 1: Accept) ── */}
      <div className="space-y-4">
        {/* Real-time Alert Card */}
        <div className={`rounded-2xl border p-5 shadow-sm space-y-3 transition-all ${
          alertStatus === "CLAIMED_BY_OTHER"
            ? "border-slate-300 bg-slate-100/80 opacity-90"
            : alertStatus === "ACCEPTED"
            ? "border-emerald-300 bg-emerald-50/40"
            : alertStatus === "DECLINED"
            ? "border-slate-300 bg-slate-50 opacity-70"
            : "border-rose-300 bg-gradient-to-br from-rose-50 via-white to-amber-50"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">
                {alertStatus === "CLAIMED_BY_OTHER" ? "🔒" : alertStatus === "ACCEPTED" ? "✅" : alertStatus === "DECLINED" ? "✖️" : "🚨"}
              </span>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Help Needed Near You</h2>
                <p className="text-xs font-semibold text-slate-600">Automatic location-based volunteer alert</p>
              </div>
            </div>
            {alertStatus === "CLAIMED_BY_OTHER" ? (
              <span className="px-3 py-1 rounded-full bg-slate-300 text-slate-700 font-extrabold text-xs">
                Already Accepted
              </span>
            ) : alertStatus === "ACCEPTED" ? (
              <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-extrabold text-xs">
                Task Reserved & Assigned
              </span>
            ) : alertStatus === "DECLINED" ? (
              <span className="px-3 py-1 rounded-full bg-slate-400 text-white font-bold text-xs">
                Declined
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-rose-600 text-white font-black text-xs uppercase animate-pulse shadow-xs">
                Priority: High
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs border-t border-slate-200">
            <div>
              <span className="text-slate-500 text-[10px] font-bold uppercase">Location</span>
              <p className="font-bold text-slate-900">📍 Zone B, Rathmalana</p>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] font-bold uppercase">Problem</span>
              <p className="font-bold text-slate-900">Flood assistance required</p>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] font-bold uppercase">Distance</span>
              <p className="font-bold text-slate-900">📏 2.3 km away</p>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] font-bold uppercase">Needed By</span>
              <p className="font-bold text-amber-700">⏰ Needed by 6:00 PM</p>
            </div>
          </div>

          {/* Mandatory Disclaimer */}
          <div className="p-3 rounded-xl bg-amber-100/80 border border-amber-300/80 text-amber-900 text-xs font-medium flex items-center gap-2">
            <Info size={16} className="text-amber-700 shrink-0" />
            <span>"Accepting this alert makes you eligible for assignment. It does not automatically assign you to a task until PlanningEngine computes the best match."</span>
          </div>

          {/* Action Buttons & Exclusivity Lockout */}
          <div className="pt-1">
            {alertStatus === "CLAIMED_BY_OTHER" ? (
              <div className="p-3.5 rounded-xl bg-slate-200/80 border border-slate-300 text-slate-800 text-xs font-bold flex items-center gap-2">
                <Lock size={16} className="text-slate-600 shrink-0" />
                <span>"This task has already been accepted by another volunteer. This alert is disabled."</span>
              </div>
            ) : alertStatus === "ACCEPTED" ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-950 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-extrabold text-xs">"Yes, I can help." — Task Reserved & Route Generated!</p>
                    <p className="text-[11px] text-emerald-800">System disabled other alerts and assigned task to you.</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-extrabold text-[11px] shrink-0 text-center">
                  Assigned & Reserved
                </span>
              </div>
            ) : alertStatus === "DECLINED" ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-200/80 border border-slate-300 text-slate-700 text-xs">
                <span className="font-medium">Alert Declined. You will not receive further notifications for this item.</span>
                <button
                  onClick={handleUndoDecline}
                  className="text-xs font-bold text-sky-700 hover:underline px-2 py-1 bg-white rounded-md border border-slate-300"
                >
                  Undo Decline
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAcceptAlert}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <CheckCircle2 size={17} /> Yes, I can help [Accept]
                </button>
                <button
                  onClick={handleDeclineAlert}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                >
                  [Decline]
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── AUTOMATED EXECUTION PANEL (Steps 2, 3, 4) ── */}
        {(assignedTaskState !== "NONE" || alertStatus === "ACCEPTED") && (
          <div className="rounded-2xl border border-emerald-300 bg-white p-5 shadow-lg space-y-4 animate-fade-in">
            {/* Header & Status Stepper */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-emerald-600 animate-pulse" />
                  Automated Execution Pipeline
                </h2>
                <p className="text-xs text-slate-500">Zero manual button clicks — automatic geofencing & verification</p>
              </div>

              {/* Status Badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                assignedTaskState === "DELIVERED"
                  ? "bg-emerald-600 text-white"
                  : assignedTaskState === "IN_TRANSIT"
                  ? "bg-amber-500 text-slate-950 animate-pulse"
                  : "bg-sky-600 text-white"
              }`}>
                {assignedTaskState === "ASSIGNED" ? "1. Assigned / Reserved" :
                 assignedTaskState === "IN_TRANSIT" ? "3. In Transit (GPS Active)" : "4. Delivered & Completed"}
              </span>
            </div>

            {/* Visual Stepper */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Automated System State</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-extrabold text-[11px]">
                <div className={`p-2 rounded-xl border ${alertStatus === "ACCEPTED" ? "bg-emerald-100 border-emerald-300 text-emerald-900" : "bg-slate-100 text-slate-400"}`}>
                  1. Accept ✓<br /><span className="text-[9px] font-normal">Reserved</span>
                </div>
                <div className={`p-2 rounded-xl border ${pickupVerified ? "bg-emerald-100 border-emerald-300 text-emerald-900" : geofenceAtPickup ? "bg-amber-100 border-amber-300 text-amber-900 animate-pulse" : "bg-slate-100 text-slate-400"}`}>
                  2. Pickup {pickupVerified ? "✓" : "📍"}<br /><span className="text-[9px] font-normal">{pickupVerified ? "Donor Verified" : "Geofence Active"}</span>
                </div>
                <div className={`p-2 rounded-xl border ${assignedTaskState === "IN_TRANSIT" ? "bg-amber-100 border-amber-300 text-amber-900 animate-pulse" : deliveryVerified ? "bg-emerald-100 border-emerald-300 text-emerald-900" : "bg-slate-100 text-slate-400"}`}>
                  3. In Transit 🚚<br /><span className="text-[9px] font-normal">{gpsDistance} km away</span>
                </div>
                <div className={`p-2 rounded-xl border ${deliveryVerified ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 text-slate-400"}`}>
                  4. Delivered 🎉<br /><span className="text-[9px] font-normal">{deliveryVerified ? "Recipient OTP Verified" : "Recipient OTP"}</span>
                </div>
              </div>
            </div>

            {/* ── STEP 2: PICKUP GEOFENCE & DONOR OTP/QR SCAN ── */}
            {!pickupVerified && geofenceAtPickup && (
              <div className="p-4 rounded-2xl border border-amber-300 bg-amber-50/80 space-y-3 animate-slide-up">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio size={18} className="text-amber-700 animate-ping" />
                    <div>
                      <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider">📍 Geofence Detected Pickup Location</h3>
                      <p className="text-[11px] font-bold text-amber-800">Volunteer reached Central Relief Depot (Rathmalana)</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                    Donor Scan Required
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs space-y-2">
                  <p className="font-bold text-slate-800">Donor scans QR or enters OTP to verify pickup:</p>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={donorOtpInput}
                        onChange={(e) => {
                          setDonorOtpInput(e.target.value);
                          if (e.target.value === "7892") handleVerifyPickup("7892");
                        }}
                        placeholder="Enter Donor OTP (Try: 7892)..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => handleVerifyPickup("7892")}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-xs cursor-pointer"
                    >
                      Submit OTP
                    </button>
                    <button
                      onClick={() => handleVerifyPickup("AUTO_QR")}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <QrCode size={14} /> Scan QR
                    </button>
                  </div>
                </div>

                <p className="text-[11px] font-semibold text-amber-800/80 italic">
                  ⚡ Once donor scans QR/OTP, system automatically sets status: <strong className="text-amber-900 font-bold">Assigned → Pickup Verified → In Transit</strong> (No manual "Pickup Complete" click needed).
                </p>
              </div>
            )}

            {/* ── STEP 3: SYSTEM CONTROLLED NAVIGATION & TELEMETRY ── */}
            {assignedTaskState === "IN_TRANSIT" && (
              <TaskNavigationCard
                taskId={tasks.length > 0 ? (tasks[0].task_id || tasks[0].id) : "TSK-101"}
                taskTitle="Relief Supplies Delivery"
                pickupLocation="Central Relief Depot (Rathmalana)"
                destinationLocation="Zone B Community Shelter #3"
                volunteerId="vol-a"
                onTaskRecovered={() => {
                  setAssignedTaskState("NONE");
                  setAlertStatus("IDLE");
                  setPickupVerified(false);
                  setDeliveryVerified(false);
                }}
              />
            )}

            {/* ── STEP 4: DELIVERY GEOFENCE & RECIPIENT OTP/QR SCAN ── */}
            {assignedTaskState === "IN_TRANSIT" && geofenceAtDelivery && !deliveryVerified && (
              <div className="p-4 rounded-2xl border border-emerald-400 bg-emerald-50 space-y-3 animate-slide-up">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio size={18} className="text-emerald-700 animate-ping" />
                    <div>
                      <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider">📍 Geofence Detected Destination</h3>
                      <p className="text-[11px] font-bold text-emerald-800">Volunteer arrived at Zone B Community Shelter #3</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 border border-emerald-300">
                    Recipient OTP Required
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-emerald-200 text-xs space-y-2">
                  <p className="font-bold text-slate-800">Recipient scans QR or enters OTP to confirm delivery:</p>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={recipientOtpInput}
                        onChange={(e) => {
                          setRecipientOtpInput(e.target.value);
                          if (e.target.value === "4109") handleVerifyDelivery("4109");
                        }}
                        placeholder="Enter Recipient OTP (Try: 4109)..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => handleVerifyDelivery("4109")}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs cursor-pointer"
                    >
                      Confirm OTP
                    </button>
                    <button
                      onClick={() => handleVerifyDelivery("AUTO_QR")}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <QrCode size={14} /> Scan Recipient QR
                    </button>
                  </div>
                </div>

                <p className="text-[11px] font-semibold text-emerald-800/80 italic">
                  ⚡ Recipient confirmation automatically transitions: <strong className="text-emerald-950 font-bold">In Transit → Delivered → Completed</strong>.
                </p>
              </div>
            )}

            {/* ── STEP 5: COMPLETED CONFIRMATION ── */}
            {deliveryVerified && (
              <div className="p-4 rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-100 via-white to-teal-50 space-y-2 animate-fade-in text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-emerald-600" />
                    <div>
                      <h3 className="font-black text-emerald-950 text-sm">Delivery Fully Completed & Audited!</h3>
                      <p className="text-[11px] text-emerald-800 font-medium">Recipient OTP verified. Task saved to activity history.</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-extrabold text-xs">
                    🎉 Completed
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
                  <span className="flex items-center gap-1"><MapPin size={11} className="text-slate-400" />{formatLocation(task.pickup_location, "Hub")} → {formatLocation(task.delivery_location || task.destination, "Recipient")}</span>
                </td>
                <td className="px-4 py-3 text-xs font-semibold text-slate-700">{task.priority || "MEDIUM"}</td>
                <td className="px-4 py-3"><StatusBadge status={task.status || "ASSIGNED"} pulse={task.status === "IN_PROGRESS"} /></td>
                <td className="px-4 py-3">
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">{task.risk_level || "Green"}</span>
                </td>
                <td className="px-4 py-3 flex items-center gap-2">
                  {!task.pickup_verified && (
                    <button
                      onClick={() => setVerModal({ isOpen: true, taskId: task.task_id || task.id || "TSK-101", type: "pickup", expectedOtp: "789201" })}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <QrCode size={12} /> Verify Pickup
                    </button>
                  )}
                  {task.pickup_verified && !task.delivery_verified && (
                    <button
                      onClick={() => setVerModal({ isOpen: true, taskId: task.task_id || task.id || "TSK-101", type: "delivery", expectedOtp: "410932" })}
                      className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-[11px] shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <QrCode size={12} /> Verify Delivery
                    </button>
                  )}
                  {task.delivery_verified && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ✓ Completed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      {/* Interactive Verification Modal */}
      <VerificationModal
        isOpen={verModal.isOpen}
        onClose={() => setVerModal(prev => ({ ...prev, isOpen: false }))}
        taskId={verModal.taskId}
        verificationType={verModal.type}
        expectedOtp={verModal.expectedOtp}
        onSuccess={() => {
          if (verModal.type === "pickup") {
            setPickupVerified(true);
            setAssignedTaskState("IN_TRANSIT");
          } else {
            setDeliveryVerified(true);
            setAssignedTaskState("DELIVERED");
          }
        }}
      />
    </div>
  );
}
