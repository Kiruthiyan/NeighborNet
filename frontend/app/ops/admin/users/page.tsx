"use client";

import { useState, useEffect } from "react";
import { UserCheck, Shield, Search, ShieldAlert, Check, X, Trash2 } from "lucide-react";
import { Panel, StatusBadge, EmptyState } from "../../../../components/ui";
import { listUsers, updateUser, deleteUser, UserProfile } from "../../../../lib/api";

export default function OpsAdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadUserList = async () => {
    setLoading(true);
    try {
      const data = await listUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserList();
  }, []);

  const handleToggleCapability = async (
    userId: string,
    key: "is_coordinator" | "is_donor" | "is_volunteer" | "is_active",
    currentValue: boolean
  ) => {
    try {
      await updateUser(userId, { [key]: !currentValue });
      await loadUserList();
    } catch (err) {
      console.error("Failed to update user", err);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUser(userId);
      await loadUserList();
    } catch (err) {
      console.error("Failed to delete user", err);
    }
  };

  const filtered = users.filter(
    (u) =>
      (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.user_id || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 font-sans">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400">
            System Administration
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <UserCheck className="text-purple-400" size={24} />
          User & Role Capability Management
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Grant coordinator privileges, verify volunteer accounts, manage role flags, or revoke access.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search users by name, email, user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-slate-800 border border-slate-700 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>

      <Panel dark title={`Registered Network Accounts (${filtered.length})`}>
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading user accounts...</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={UserCheck}>
            <p className="font-semibold text-slate-300">No matching user accounts</p>
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">User Profile</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Coordinator</th>
                  <th className="px-4 py-3">Donor</th>
                  <th className="px-4 py-3">Volunteer</th>
                  <th className="px-4 py-3">Account Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((u) => (
                  <tr key={u.user_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-purple-900/60 border border-purple-700 flex items-center justify-center font-bold text-purple-300 text-xs">
                        {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{u.name || "Member"}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{u.user_id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{u.email}</td>

                    {/* Coordinator Toggle */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleCapability(u.user_id, "is_coordinator", u.is_coordinator)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                          u.is_coordinator
                            ? "bg-purple-950 text-purple-400 border border-purple-700"
                            : "bg-slate-800 text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {u.is_coordinator ? "Coordinator" : "+ Grant"}
                      </button>
                    </td>

                    {/* Donor Toggle */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleCapability(u.user_id, "is_donor", u.is_donor)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                          u.is_donor
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-700"
                            : "bg-slate-800 text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {u.is_donor ? "Donor" : "+ Grant"}
                      </button>
                    </td>

                    {/* Volunteer Toggle */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleCapability(u.user_id, "is_volunteer", u.is_volunteer)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                          u.is_volunteer
                            ? "bg-sky-950 text-sky-400 border border-sky-700"
                            : "bg-slate-800 text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {u.is_volunteer ? "Volunteer" : "+ Grant"}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={u.is_active ? "ACTIVE" : "DISABLED"} />
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(u.user_id)}
                        className="text-rose-400 hover:text-rose-300 p-1.5 rounded hover:bg-rose-950/40 transition-colors"
                        title="Delete User Account"
                      >
                        <Trash2 size={14} />
                      </button>
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
