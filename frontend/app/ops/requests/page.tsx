"use client";

import { useState, useEffect } from "react";
import { HeartHandshake, Filter, Search } from "lucide-react";
import { Panel, Table, StatusBadge, EmptyState } from "../../../components/ui";
import { apiGet } from "../../../lib/api";

export default function OpsRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

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
