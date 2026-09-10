"use client";

import { useState, useEffect } from "react";
import { FileText, Search, Filter, ShieldCheck, User } from "lucide-react";
import { Panel, StatusBadge, EmptyState } from "../../../components/ui";
import { apiGet } from "../../../lib/api";

export default function OpsAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");

  useEffect(() => {
    async function loadAuditLogs() {
      try {
        const data = await apiGet<any[]>("/audit", []);
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load audit logs", err);
      } finally {
        setLoading(false);
      }
    }
    loadAuditLogs();
  }, []);

  const filtered = logs.filter((log) => {
    const matchesSearch =
      (log.action || "").toLowerCase().includes(search.toLowerCase()) ||
      (log.actor || "").toLowerCase().includes(search.toLowerCase());
    const matchesRisk = riskFilter === "ALL" || (log.risk_level || "").toUpperCase() === riskFilter;
    return matchesSearch && matchesRisk;
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <FileText className="text-sky-400" size={24} />
          Immutable Audit Trail & Activity Logs
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Complete transparent system log of AI deterministic executions, coordinator approvals, and mode switches.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search audit trail by actor, action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="text-slate-500 shrink-0" size={16} />
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-semibold text-white focus:border-sky-500 focus:outline-none"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="GREEN">Green (Auto-executed)</option>
            <option value="AMBER">Amber (Approved)</option>
            <option value="RED">Red (Blocked)</option>
          </select>
        </div>
      </div>

      <Panel dark title={`Audit Event History (${filtered.length})`}>
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading audit history...</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={FileText}>
            <p className="font-semibold text-slate-300">No matching audit events</p>
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor / Agent</th>
                  <th className="px-4 py-3">Action Description</th>
                  <th className="px-4 py-3">Operating Mode</th>
                  <th className="px-4 py-3">Risk Tier</th>
                  <th className="px-4 py-3">Human Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : "Just now"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white flex items-center gap-1.5">
                      <User size={12} className="text-sky-400" />
                      {log.actor || "AI Deterministic Engine"}
                    </td>
                    <td className="px-4 py-3 text-slate-200">{log.action || log.event_type}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-[11px]">
                      {log.mode || "NORMAL"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          (log.risk_level || "GREEN").toUpperCase() === "GREEN"
                            ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                            : (log.risk_level || "").toUpperCase() === "RED"
                            ? "bg-rose-950 text-rose-400 border-rose-800"
                            : "bg-amber-950 text-amber-400 border-amber-800"
                        }`}
                      >
                        {log.risk_level || "GREEN"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {log.approved_by ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <ShieldCheck size={12} /> {log.approved_by}
                        </span>
                      ) : (
                        <span className="text-slate-500">Auto (Deterministic)</span>
                      )}
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
