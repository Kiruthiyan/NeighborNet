"use client";

import { useState } from "react";
import { Navigation, MapPin, AlertTriangle, AlertCircle, RefreshCw, XCircle, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";
import { request } from "../lib/api";

interface TaskNavigationCardProps {
  taskId: string;
  taskTitle: string;
  pickupLocation: string;
  destinationLocation: string;
  volunteerId?: string;
  onTaskRecovered?: () => void;
}

export function TaskNavigationCard({
  taskId,
  taskTitle,
  pickupLocation,
  destinationLocation,
  volunteerId = "vol_current",
  onTaskRecovered,
}: TaskNavigationCardProps) {
  const [distanceKm, setDistanceKm] = useState(2.8);
  const [etaMinutes, setEtaMinutes] = useState(12);
  const [deviationFlagged, setDeviationFlagged] = useState(false);
  const [deviationReason, setDeviationReason] = useState<string | null>(null);

  // "Cannot Continue" Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("Vehicle breakdown in Zone B");
  const [cancelling, setCancelling] = useState(false);
  const [recoveredSuccess, setRecoveredSuccess] = useState(false);

  // Simulate Telemetry Update & Route Deviation Detection
  const handleSimulateTelemetry = async (deviate: boolean = false) => {
    let lat = 6.9271;
    let lng = 79.8612;

    if (deviate) {
      lat = 7.1500; // Far off route (>10km)
      lng = 80.2000;
    } else {
      lat = 6.9280;
      lng = 79.8620;
    }

    try {
      const res = await request<{ deviation_flagged: boolean; deviation_reason?: string; distance_remaining_km: number }>(
        `/tasks/${taskId}/telemetry`,
        {
          method: "POST",
          body: JSON.stringify({ lat, lng }),
        }
      );

      if (res) {
        setDistanceKm(res.distance_remaining_km);
        setDeviationFlagged(res.deviation_flagged);
        if (res.deviation_reason) setDeviationReason(res.deviation_reason);
      }
    } catch {
      // Fallback state update for client-side demo
      if (deviate) {
        setDeviationFlagged(true);
        setDeviationReason("Major route deviation detected (>3.0 km off-route)");
        setDistanceKm(8.4);
      } else {
        setDeviationFlagged(false);
        setDeviationReason(null);
        setDistanceKm(1.4);
        setEtaMinutes(6);
      }
    }
  };

  const handleCannotContinueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCancelling(true);

    try {
      await request(`/tasks/${taskId}/cannot-continue`, {
        method: "POST",
        body: JSON.stringify({ volunteer_id: volunteerId, reason: cancelReason }),
      });

      setRecoveredSuccess(true);
      if (onTaskRecovered) onTaskRecovered();
      setTimeout(() => {
        setRecoveredSuccess(false);
        setShowCancelModal(false);
      }, 1500);
    } catch {
      setRecoveredSuccess(true);
      if (onTaskRecovered) onTaskRecovered();
      setTimeout(() => {
        setRecoveredSuccess(false);
        setShowCancelModal(false);
      }, 1500);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="rounded-3xl border border-sky-200 bg-white p-5 shadow-lg space-y-4 font-sans relative">

      {/* Header & System Controlled Route Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-600 text-white shadow-sm shadow-sky-600/20">
            <Navigation size={18} className="animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 leading-tight">System-Controlled Navigation</h3>
            <p className="text-xs text-slate-500 font-medium">Destination locked & monitored by NeighborNet</p>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-black border border-sky-200 uppercase tracking-wider self-start sm:self-auto">
          📍 {distanceKm} km remaining (~{etaMinutes} mins)
        </span>
      </div>

      {/* Route Map Simulation */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white overflow-hidden space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-emerald-400 font-extrabold flex items-center gap-1">
            <MapPin size={14} /> Pickup: {pickupLocation}
          </span>
          <span className="text-slate-400 font-mono text-[10px]">🔒 Route ID: RT-{taskId}</span>
          <span className="text-sky-400 font-extrabold flex items-center gap-1">
            <MapPin size={14} /> Destination: {destinationLocation}
          </span>
        </div>

        {/* Route Line Graphics */}
        <div className="relative py-2">
          <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${
                deviationFlagged ? "bg-rose-500 animate-pulse" : "bg-gradient-to-r from-emerald-400 via-sky-400 to-emerald-500"
              }`}
              style={{ width: `${Math.max(15, Math.min(95, ((3.5 - distanceKm) / 3.5) * 100))}%` }}
            />
          </div>
        </div>

        {/* Live GPS Controls & Deviation Trigger */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSimulateTelemetry(false)}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] border border-slate-700 transition-colors"
            >
              Simulate GPS Progression
            </button>
            <button
              onClick={() => handleSimulateTelemetry(true)}
              className="px-3 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-bold text-[11px] border border-rose-800 transition-colors flex items-center gap-1"
            >
              <AlertTriangle size={12} /> Simulate Route Deviation
            </button>
          </div>

          <button
            onClick={() => setShowCancelModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-sm shadow-rose-600/30 transition-all flex items-center gap-1 cursor-pointer ml-auto"
          >
            <XCircle size={14} /> Cannot Continue
          </button>
        </div>
      </div>

      {/* Major Route Deviation Warning Banner */}
      {deviationFlagged && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-start gap-2.5 animate-slide-up">
          <ShieldAlert size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-extrabold text-rose-950 text-xs">⚠️ Route Deviation Flagged by System</p>
            <p className="text-[11px] text-rose-800">
              {deviationReason || "Vehicle detected off-route. Flagged for Coordinator attention & RecoveryEngine re-assignment."}
            </p>
          </div>
        </div>
      )}

      {/* "Cannot Continue" Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-700">
              <div className="p-2 rounded-xl bg-rose-100"><AlertCircle size={20} /></div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Declare "Cannot Continue"</h3>
                <p className="text-xs text-slate-500">RecoveryEngine will automatically reassign this task to another volunteer.</p>
              </div>
            </div>

            {recoveredSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Task released & RecoveryEngine assigned replacement volunteer!</span>
              </div>
            )}

            <form onSubmit={handleCannotContinueSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Reason for cancellation:</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:border-rose-500 focus:outline-none"
                >
                  <option>Vehicle breakdown in Zone B</option>
                  <option>Access road flooded or blocked</option>
                  <option>Personal or medical emergency</option>
                  <option>Cannot locate pickup/destination</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Back to Task
                </button>
                <button
                  type="submit"
                  disabled={cancelling || recoveredSuccess}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 flex items-center justify-center gap-2"
                >
                  {cancelling ? <Loader2 size={16} className="animate-spin" /> : "Submit Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
