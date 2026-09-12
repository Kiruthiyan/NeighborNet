"use client";

import { useState, useEffect } from "react";
import { HeartHandshake, Filter, Search, Globe2, AlertTriangle, Loader2 } from "lucide-react";
import { Panel, Table, StatusBadge, EmptyState, Badge } from "../../../components/ui";
import { apiGet, getCrossRegionAssistance, type CrossRegionAssistanceResult } from "../../../lib/api";

const REGIONS = ["north", "central", "south"];
const RESOURCE_TYPES = [
  "prepared_meal", "fresh_produce", "pantry_item", "frozen_food", "dairy",
  "beverages", "food", "water", "medical", "clothing", "equipment"
];

export default function OpsRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Cross-region assistance check (feature/cross-region-assistance)
  const [crRegion, setCrRegion] = useState("south");
  const [crResourceType, setCrResourceType] = useState("equipment");
  const [crQuantity, setCrQuantity] = useState(50);
  const [crResult, setCrResult] = useState<CrossRegionAssistanceResult | null>(null);
  const [crLoading, setCrLoading] = useState(false);
  const [crError, setCrError] = useState<string | null>(null);

  const handleCheckCrossRegion = async () => {
    setCrLoading(true);
    setCrError(null);
    setCrResult(null);
    try {
      const result = await getCrossRegionAssistance(crRegion, crResourceType, crQuantity);
      setCrResult(result);
    } catch (err) {
      setCrError(err instanceof Error ? err.message : "Failed to check cross-region assistance");
    } finally {
      setCrLoading(false);
    }
  };

  useEffect(() => {
    async function loadRequests() {
      try {
        const data = await apiGet<any[]>("/requests", []);
        setRequests(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load ops requests", err);
      } finally {
        setLoading(false);
      }
    }
    loadRequests();
  }, []);

  const filtered = requests.filter((req) => {
    const matchesSearch =
      (req.resource_type || "").toLowerCase().includes(search.toLowerCase()) ||
      (req.request_id || req.id || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || (req.status || "").toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <HeartHandshake className="text-sky-400" size={24} />
          Network Request Management
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Monitor all community assistance requests across zones, verify urgency, and check match statuses.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search requests by ID, resource type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="text-slate-500 shrink-0" size={16} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-semibold text-white focus:border-sky-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="MATCHED">Matched</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      <Panel dark title="Cross-Region Assistance Check" icon={Globe2}>
        <p className="text-xs text-slate-400 mb-4">
          Preview whether another region has surplus that could help fulfill a shortfall in a region -
          never commits anything, and never dips into another region's own pending demand.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Region in need</label>
            <select
              value={crRegion}
              onChange={(e) => setCrRegion(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white"
            >
              {REGIONS.map((r) => (<option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Resource type</label>
            <select
              value={crResourceType}
              onChange={(e) => setCrResourceType(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white"
            >
              {RESOURCE_TYPES.map((rt) => (<option key={rt} value={rt}>{rt}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">Quantity needed</label>
            <input
              type="number"
              min={0}
              value={crQuantity}
              onChange={(e) => setCrQuantity(Number(e.target.value))}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white"
            />
          </div>
          <button
            onClick={handleCheckCrossRegion}
            disabled={crLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2"
          >
            {crLoading ? <Loader2 size={14} className="animate-spin" /> : <Globe2 size={14} />}
            Check
          </button>
        </div>

        {crError && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-950/60 border border-rose-500/40 p-3 text-xs text-rose-300">
            <AlertTriangle size={14} /> {crError}
          </div>
        )}

        {crResult && (
          <div className="mt-4 p-4 rounded-xl border border-slate-700 bg-slate-900 text-xs text-slate-300 space-y-2">
            <p>
              Local available in <strong className="text-white">{crResult.region}</strong>:{" "}
              <strong className="text-white">{crResult.local_available}</strong> — Shortfall:{" "}
              <strong className={crResult.shortfall > 0 ? "text-rose-400" : "text-emerald-400"}>
                {crResult.shortfall}
              </strong>
            </p>
            {crResult.shortfall === 0 ? (
              <p className="text-emerald-400">Local supply covers the need — no cross-region assistance required.</p>
            ) : crResult.cross_region_candidates.length === 0 ? (
              <p className="text-amber-400">No other region currently has surplus to offer.</p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {crResult.cross_region_candidates.map((c) => (
                  <Badge key={c.region} tone="blue">
                    {c.region}: {c.available_surplus} surplus ({c.batch_ids.length} batch{c.batch_ids.length === 1 ? "" : "es"})
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </Panel>

      <Panel dark title={`All Community Requests (${filtered.length})`}>
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading requests...</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={HeartHandshake}>
            <p className="font-semibold text-slate-300">No matching requests found</p>
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Request ID</th>
                  <th className="px-4 py-3">Resource Type</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Urgency</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((req) => (
                  <tr key={req.id || req.request_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-sky-400">
                      {req.request_id || req.id || "REQ-001"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">{req.resource_type}</td>
                    <td className="px-4 py-3 text-slate-300">{req.quantity}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] font-bold ${
                          req.urgency === "HIGH" ? "text-rose-400" : "text-slate-400"
                        }`}
                      >
                        {req.urgency || "MEDIUM"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={req.status || "PENDING"} pulse={req.status === "MATCHED"} />
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {req.created_at ? new Date(req.created_at).toLocaleDateString() : "Today"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
