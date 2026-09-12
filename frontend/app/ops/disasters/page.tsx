"use client";

import { useState, useEffect } from "react";
import { Flame, Plus, X, AlertTriangle, Users, CheckCircle2, ShieldAlert, Loader2, XCircle } from "lucide-react";
import { Panel, StatusBadge, EmptyState, Badge } from "../../../components/ui";
import {
  apiGet,
  request,
  getPendingDisasters,
  verifyDisaster,
  rejectDisaster,
  getDisastersByRegion
} from "../../../lib/api";

const REGIONS = ["north", "central", "south"];

export default function OpsDisastersPage() {
  const [disasters, setDisasters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pending citizen reports awaiting coordinator review (feature/disaster-verification)
  const [pending, setPending] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const loadPending = async () => {
    setPendingLoading(true);
    try {
      const data = await getPendingDisasters();
      setPending(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load pending disaster reports", err);
    } finally {
      setPendingLoading(false);
    }
  };

  // Form State
  const [name, setName] = useState("");
  const [disasterType, setDisasterType] = useState("FLOOD");
  const [zone, setZone] = useState("Zone 1");
  const [severity, setSeverity] = useState("HIGH");

  const [regionFilter, setRegionFilter] = useState("");

  const loadDisasters = async (region = regionFilter) => {
    setLoading(true);
    try {
      const data = region ? await getDisastersByRegion(region) : await apiGet<any[]>("/disasters", []);
      setDisasters(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load disasters", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegionFilterChange = (region: string) => {
    setRegionFilter(region);
    loadDisasters(region);
  };

  useEffect(() => {
    loadDisasters();
    loadPending();
  }, []);

  const handleVerify = async (disasterId: string) => {
    setActingId(disasterId);
    setReviewError(null);
    try {
      await verifyDisaster(disasterId, {});
      await Promise.all([loadPending(), loadDisasters()]);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Failed to verify report");
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (disasterId: string) => {
    const reason = window.prompt(
      "Reason for rejecting this report? (e.g. false_report, duplicate, incomplete, malicious)",
      "false_report"
    );
    if (!reason) return;
    setActingId(disasterId);
    setReviewError(null);
    try {
      await rejectDisaster(disasterId, reason);
      await loadPending();
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Failed to reject report");
    } finally {
      setActingId(null);
    }
  };

  const handleDeclareDisaster = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await request("/disasters", {
        method: "POST",
        body: JSON.stringify({
          name: name || `${disasterType} Emergency`,
          disaster_type: disasterType,
          zone,
          severity,
        }),
      });
      setShowModal(false);
      setName("");
      await loadDisasters();
    } catch (err: any) {
      setError(err?.message || "Failed to declare disaster");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Flame className="text-rose-500 animate-pulse" size={24} />
            Disaster Emergency Command
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Declare emergencies, trigger automated volunteer pipeline alerts, and coordinate disaster response zones.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-4 py-2.5 text-xs font-bold shadow-lg shadow-rose-600/20 transition-all"
        >
          <Plus size={16} /> Declare Emergency
        </button>
      </div>

      <Panel dark title={`Pending Reports Awaiting Verification (${pending.length})`}>
        {reviewError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-950/60 border border-rose-500/40 p-3 text-xs text-rose-300">
            <AlertTriangle size={16} /> {reviewError}
          </div>
        )}
        {pendingLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading pending reports...</div>
        ) : pending.length === 0 ? (
          <EmptyState icon={ShieldAlert}>
            <p className="font-semibold text-slate-300">No pending citizen reports</p>
            <p className="text-xs text-slate-500 mt-1">
              Reports filed via "Report a Disaster" (see feature/disaster-reporting) appear here for review.
            </p>
          </EmptyState>
        ) : (
          <div className="space-y-3">
            {pending.map((report) => (
              <div
                key={report.disaster_id}
                className="p-4 rounded-xl border border-amber-500/30 bg-slate-900 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-white">{report.title}</h3>
                    <Badge tone="amber">{String(report.severity).toUpperCase()}</Badge>
                    {report.region && <Badge tone="blue">{String(report.region).toUpperCase()}</Badge>}
                    {report.is_duplicate && <Badge tone="red">Possible duplicate</Badge>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {report.type} • {report.description || "No description provided"}
                  </p>
                </div>
                <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
                  <button
                    onClick={() => handleVerify(report.disaster_id)}
                    disabled={actingId === report.disaster_id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-1.5 text-xs font-bold"
                  >
                    {actingId === report.disaster_id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    Verify &amp; Activate
                  </button>
                  <button
                    onClick={() => handleReject(report.disaster_id)}
                    disabled={actingId === report.disaster_id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-rose-300 border border-rose-500/30 px-3 py-1.5 text-xs font-bold"
                  >
                    <XCircle size={13} />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        dark
        title={`Active Emergency Declarations (${disasters.length})`}
        action={
          <select
            value={regionFilter}
            onChange={(e) => handleRegionFilterChange(e.target.value)}
            className="rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-200 focus:border-rose-500 focus:outline-none"
          >
            <option value="">All Regions</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        }
      >
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading declarations...</div>
        ) : disasters.length === 0 ? (
          <EmptyState icon={Flame}>
            <p className="font-semibold text-slate-300">No active disaster declarations</p>
            <p className="text-xs text-slate-500 mt-1">
              System is operating in Everyday Normal Mode.
            </p>
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {disasters.map((disaster) => (
              <div
                key={disaster.id || disaster.disaster_id}
                className="p-5 rounded-xl border border-rose-500/30 bg-slate-900 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{disaster.name || disaster.disaster_type}</h3>
                    <span className="rounded bg-rose-500/20 text-rose-300 px-2 py-0.5 text-[10px] font-bold border border-rose-500/30">
                      {disaster.severity || "HIGH"} SEVERITY
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Zone: <strong className="text-slate-200">{disaster.zone || "Zone 1"}</strong> • Declared:{" "}
                    <span className="text-slate-400">
                      {disaster.created_at ? new Date(disaster.created_at).toLocaleString() : "Recently"}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pipeline Responders</p>
                    <p className="text-sm font-bold text-sky-400 flex items-center gap-1 mt-0.5">
                      <Users size={14} /> 12 Eligible Volunteers
                    </p>
                  </div>
                  <StatusBadge status={disaster.status || "ACTIVE"} pulse />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Declare Emergency Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="text-rose-500" size={20} />
                Declare Emergency Operation
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-950/60 border border-rose-500/40 p-3 text-xs text-rose-300">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleDeclareDisaster} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Declaration Title</label>
                <input
                  type="text"
                  placeholder="e.g. Flash Flood Emergency - Lower District"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Disaster Type</label>
                <select
                  value={disasterType}
                  onChange={(e) => setDisasterType(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-bold text-white focus:border-rose-500 focus:outline-none"
                >
                  <option value="FLOOD">Flood / Heavy Rainfall</option>
                  <option value="EARTHQUAKE">Earthquake / Tremor</option>
                  <option value="STORM">Severe Storm / Tornado</option>
                  <option value="WILDFIRE">Wildfire / Smoke Hazard</option>
                  <option value="POWER_OUTAGE">Grid Outage / Infrastructure</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Affected Zone</label>
                <input
                  type="text"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Severity Rating</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-bold text-white focus:border-rose-500 focus:outline-none"
                >
                  <option value="LOW">Low (Monitoring)</option>
                  <option value="MEDIUM">Medium (Local Volunteers Mobilized)</option>
                  <option value="HIGH">High (Full Area Emergency)</option>
                  <option value="CRITICAL">Critical (Life Safety Emergency)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/30 disabled:opacity-50"
                >
                  {submitting ? "Declaring..." : "Declare Emergency"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
