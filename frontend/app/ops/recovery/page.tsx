"use client";

import { useState, useEffect } from "react";
import { RotateCcw, AlertTriangle, ShieldCheck, Zap, Plus, X, Lock, Unlock, Loader2 } from "lucide-react";
import { Panel, StatusBadge, Table, Button, Input, Select, AlertBanner } from "../../../components/ui";
import { request, getZoneRestrictions, setZoneRestriction } from "../../../lib/api";

const ZONES = ["north", "central", "south"];

export default function OpsRecoveryPage() {
  const [showInjectModal, setShowInjectModal] = useState(false);
  const [taskID, setTaskID] = useState("TSK-101");
  const [disruptionType, setDisruptionType] = useState("ROAD_BLOCKED");
  const [severity, setSeverity] = useState("MEDIUM");
  const [submitting, setSubmitting] = useState(false);
  const [injectNotice, setInjectNotice] = useState<{ tone: "green" | "red"; text: string } | null>(null);

  // Zone movement restrictions (feature/movement-restrictions)
  const [restrictedZones, setRestrictedZones] = useState<string[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [togglingZone, setTogglingZone] = useState<string | null>(null);
  const [zoneError, setZoneError] = useState<string | null>(null);

  const loadZoneRestrictions = async () => {
    setZonesLoading(true);
    try {
      const data = await getZoneRestrictions();
      setRestrictedZones(data.restricted_zones || []);
    } catch (err) {
      console.error("Failed to load zone restrictions", err);
    } finally {
      setZonesLoading(false);
    }
  };

  useEffect(() => {
    loadZoneRestrictions();
  }, []);

  const handleToggleZone = async (zone: string) => {
    const currentlyRestricted = restrictedZones.includes(zone);
    setTogglingZone(zone);
    setZoneError(null);
    try {
      const data = await setZoneRestriction(zone, !currentlyRestricted);
      setRestrictedZones(data.restricted_zones || []);
    } catch (err) {
      setZoneError(err instanceof Error ? err.message : "Failed to update zone restriction");
    } finally {
      setTogglingZone(null);
    }
  };

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
    setInjectNotice(null);
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
      setInjectNotice({ tone: "green", text: "Disruption injected - AI engine calculated a recovery plan." });
    } catch (err) {
      setInjectNotice({
        tone: "red",
        text: err instanceof Error ? err.message : "Failed to inject disruption",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <RotateCcw className="text-sky-600 dark:text-sky-400" size={24} />
            Disruption & Recovery Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Deterministic recovery engine for route blockages, volunteer dropouts, and resource inventory shifts.
          </p>
        </div>
        <Button onClick={() => setShowInjectModal(true)} variant="primary" size="md">
          <Zap size={16} /> Simulate Disruption
        </Button>
      </div>

      {injectNotice && (
        <AlertBanner tone={injectNotice.tone} onDismiss={() => setInjectNotice(null)}>
          {injectNotice.text}
        </AlertBanner>
      )}

      <Panel dark title="Zone Movement Restrictions" icon={Lock}>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Lock down a zone (road closures, quarantine, an unsafe disaster area) and every future volunteer
          match - normal or disaster - excludes it, even for the closest otherwise-eligible volunteer.
        </p>
        {zoneError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 p-3 text-xs text-rose-700 dark:text-rose-300">
            <AlertTriangle size={16} /> {zoneError}
          </div>
        )}
        {zonesLoading ? (
          <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">Loading zone status...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ZONES.map((zone) => {
              const restricted = restrictedZones.includes(zone);
              return (
                <div
                  key={zone}
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    restricted
                      ? "border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-950/30"
                      : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">{zone}</p>
                    <p
                      className={`text-[11px] font-semibold ${
                        restricted ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {restricted ? "Movement Restricted" : "Open"}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleToggleZone(zone)}
                    disabled={togglingZone === zone}
                    variant={restricted ? "primary" : "danger"}
                    size="sm"
                  >
                    {togglingZone === zone ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : restricted ? (
                      <Unlock size={13} />
                    ) : (
                      <Lock size={13} />
                    )}
                    {restricted ? "Lift" : "Restrict"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel dark title="Recovery Recommendations Matrix">
        <Table columns={["Affected Task", "Disruption Cause", "AI Recovery Recommendation", "Risk Assessment", "Status"]}>
          {recoveryItems.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{item.affectedTask}</td>
              <td className="px-4 py-3 text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertTriangle size={13} /> {item.cause}
              </td>
              <td className="px-4 py-3 text-sky-600 dark:text-sky-300">{item.recommendation}</td>
              <td className="px-4 py-3">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    item.riskLevel === "Green"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
                      : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800"
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
        </Table>
      </Panel>

      {/* Simulate Disruption Modal */}
      {showInjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="text-amber-600 dark:text-amber-400" size={20} />
                Simulate Disruption Event
              </h3>
              <button
                onClick={() => setShowInjectModal(false)}
                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInjectDisruption} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Target Task ID</label>
                <Input
                  type="text"
                  value={taskID}
                  onChange={(e) => setTaskID(e.target.value)}
                  className="w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Disruption Type</label>
                <Select
                  value={disruptionType}
                  onChange={(e) => setDisruptionType(e.target.value)}
                  className="w-full font-bold"
                >
                  <option value="ROAD_BLOCKED">Road Blocked / Flooded Route</option>
                  <option value="VOLUNTEER_UNAVAILABLE">Volunteer Cancellation</option>
                  <option value="RESOURCE_EXPIRED">Inventory Expiry / Spoilage</option>
                  <option value="DEMAND_SURGE">Sudden Demand Spike</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Severity</label>
                <Select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full font-bold"
                >
                  <option value="LOW">Low (Auto-reroute)</option>
                  <option value="MEDIUM">Medium (Requires Approval)</option>
                  <option value="HIGH">High (Coordinator Intervention Required)</option>
                </Select>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowInjectModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" loading={submitting}>
                  {submitting ? "Injecting..." : "Inject Disruption"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
