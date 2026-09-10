"use client";

import { useState, useEffect } from "react";
import { Users, Search, ShieldCheck, Check, Truck, Award } from "lucide-react";
import { Panel, StatusBadge, EmptyState } from "../../../components/ui";
import { apiGet } from "../../../lib/api";

export default function OpsVolunteersPage() {
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadVolunteers() {
      try {
        const data = await apiGet<any[]>("/volunteers", []);
        setVolunteers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load ops volunteers", err);
      } finally {
        setLoading(false);
      }
    }
    loadVolunteers();
  }, []);

  const filtered = volunteers.filter((vol) =>
    (vol.name || vol.user_id || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Users className="text-sky-400" size={24} />
          Volunteer Roster & Capabilities
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Track active response personnel, verified drivers, equipment skills, and reliability metrics.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search volunteers by name, user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </div>
      </div>

      <Panel dark title={`Volunteer Personnel (${filtered.length})`}>
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading roster...</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users}>
            <p className="font-semibold text-slate-300">No volunteers found</p>
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Volunteer</th>
                  <th className="px-4 py-3">Transport</th>
                  <th className="px-4 py-3">Skills</th>
                  <th className="px-4 py-3">Zone</th>
                  <th className="px-4 py-3">Reliability Score</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((vol) => (
                  <tr key={vol.id || vol.user_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-sky-900/60 border border-sky-700 flex items-center justify-center font-bold text-sky-300 text-xs">
                        {vol.name ? vol.name.charAt(0).toUpperCase() : "V"}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{vol.name || "Volunteer"}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{vol.user_id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {vol.has_vehicle ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <Truck size={12} /> Vehicle
                        </span>
                      ) : (
                        <span className="text-slate-500">Foot / Transit</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <div className="flex flex-wrap gap-1">
                        {(vol.skills || ["Delivery"]).map((skill: string) => (
                          <span key={skill} className="rounded bg-slate-800 text-slate-300 px-1.5 py-0.5 text-[10px]">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{vol.zone || "Zone 1"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 font-bold text-amber-400">
                        <Award size={14} />
                        {vol.reliability_score || "98%"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={vol.is_verified ? "VERIFIED" : "ACTIVE"} />
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
