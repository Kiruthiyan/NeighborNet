"use client";

import { useState } from "react";
import { RotateCcw, AlertTriangle, ShieldCheck, Zap, Plus, X } from "lucide-react";
import { Panel, StatusBadge } from "../../../components/ui";
import { request } from "../../../lib/api";

export default function OpsRecoveryPage() {
  const [showInjectModal, setShowInjectModal] = useState(false);
  const [taskID, setTaskID] = useState("TSK-101");
  const [disruptionType, setDisruptionType] = useState("ROAD_BLOCKED");
  const [severity, setSeverity] = useState("MEDIUM");
  const [submitting, setSubmitting] = useState(false);

  const recoveryItems = [
    {
      id: "REC-01",
      affectedTask: "TSK-102 (Food Delivery to Shelter A)",
      cause: "Bridge Flooded - Route 4 Blocked",
      recommendation: "Reroute via High Street + reassign to Backup Volunteer Alex M.",
      riskLevel: "Green",
      status: "RECOVERED",
    },
    {
      id: "REC-02",
      affectedTask: "TSK-105 (Medical Kit Transport)",
      cause: "Volunteer Vehicle Flat Tire",
      recommendation: "Transfer cargo to Volunteer Sarah K. at Zone 2 Hub",
      riskLevel: "Amber",
      status: "PENDING_APPROVAL",
    },
  ];

  const handleInjectDisruption = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await request("/disruptions/inject", {
        method: "POST",
        body: JSON.stringify({
          task_id: taskID,
          disruption_type: disruptionType,
          severity,
        }),
      });
      setShowInjectModal(false);
      alert("Disruption injected! AI engine calculated recovery plan.");
    } catch (err) {
      console.error("Failed to inject disruption", err);
      setShowInjectModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <RotateCcw className="text-sky-400" size={24} />
            Disruption & Recovery Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic recovery engine for route blockages, volunteer dropouts, and resource inventory shifts.
          </p>
        </div>
        <button
          onClick={() => setShowInjectModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-bold shadow-md transition-all"
        >
          <Zap size={16} /> Simulate Disruption
        </button>
      </div>

      <Panel dark title="Recovery Recommendations Matrix">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Affected Task</th>
                <th className="px-4 py-3">Disruption Cause</th>
                <th className="px-4 py-3">AI Recovery Recommendation</th>
                <th className="px-4 py-3">Risk Assessment</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {recoveryItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-white">{item.affectedTask}</td>
                  <td className="px-4 py-3 text-rose-400 flex items-center gap-1">
                    <AlertTriangle size={13} /> {item.cause}
                  </td>
                  <td className="px-4 py-3 text-sky-300">{item.recommendation}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        item.riskLevel === "Green"
                          ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                          : "bg-amber-950 text-amber-400 border-amber-800"
                      }`}
                    >
                      {item.riskLevel} Risk
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} pulse={item.status === "PENDING_APPROVAL"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Simulate Disruption Modal */}
      {showInjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="text-amber-400" size={20} />
                Simulate Disruption Event
              </h3>
              <button
                onClick={() => setShowInjectModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInjectDisruption} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Target Task ID</label>
                <input
                  type="text"
                  value={taskID}
                  onChange={(e) => setTaskID(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Disruption Type</label>
                <select
                  value={disruptionType}
                  onChange={(e) => setDisruptionType(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-bold text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="ROAD_BLOCKED">Road Blocked / Flooded Route</option>
                  <option value="VOLUNTEER_UNAVAILABLE">Volunteer Cancellation</option>
                  <option value="RESOURCE_EXPIRED">Inventory Expiry / Spoilage</option>
                  <option value="DEMAND_SURGE">Sudden Demand Spike</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-bold text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="LOW">Low (Auto-reroute)</option>
                  <option value="MEDIUM">Medium (Requires Approval)</option>
                  <option value="HIGH">High (Coordinator Intervention Required)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInjectModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-md disabled:opacity-50"
                >
                  {submitting ? "Injecting..." : "Inject Disruption"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
