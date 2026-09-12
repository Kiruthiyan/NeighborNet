"use client";

import { useState, useEffect } from "react";
import { Package, Search, Clock, MapPin } from "lucide-react";
import { Panel, StatusBadge, EmptyState } from "../../../components/ui";
import { apiGet } from "../../../lib/api";
import { formatLocation } from "../../../lib/format";

export default function OpsResourcesPage() {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadResources() {
      try {
        const data = await apiGet<any[]>("/resources", []);
        setResources(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load ops resources", err);
      } finally {
        setLoading(false);
      }
    }
    loadResources();
  }, []);

  const filtered = resources.filter((item) =>
    (item.resource_type || "").toLowerCase().includes(search.toLowerCase()) ||
    (item.id || item.resource_id || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Package className="text-sky-400" size={24} />
          Resource Surplus & Inventory Command
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Monitor registered food batches, medical inventory, expiry windows, and pickup hubs.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search inventory by type, batch ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </div>
      </div>

      <Panel dark title={`Resource Batches (${filtered.length})`}>
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading inventory...</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Package}>
            <p className="font-semibold text-slate-300">No resources found</p>
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Batch ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Pickup Zone</th>
                  <th className="px-4 py-3">Expiry Window</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((item) => (
                  <tr key={item.id || item.resource_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-sky-400">
                      {item.id || item.resource_id || "RES-001"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">{item.resource_type}</td>
                    <td className="px-4 py-3 text-slate-300">{item.quantity} units</td>
                    <td className="px-4 py-3 text-slate-400 flex items-center gap-1">
                      <MapPin size={12} className="text-slate-500" />
                      {formatLocation(item.pickup_location, "Central Hub")}
                    </td>
                    <td className="px-4 py-3 text-slate-400 flex items-center gap-1">
                      <Clock size={12} className="text-slate-500" />
                      {item.expiry_hours ? `${item.expiry_hours}h remaining` : "Flexible"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status || "AVAILABLE"} pulse={item.status === "MATCHED"} />
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
