"use client";

import { useState, useEffect } from "react";
import { Mail, Plus, X, AlertCircle, ShieldCheck, Check, Trash2 } from "lucide-react";
import { Panel, StatusBadge, EmptyState } from "../../../../components/ui";
import { listInvitations, createInvitation, revokeInvitation, Invitation } from "../../../../lib/api";

export default function OpsAdminInvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState("");
  const [grantCoordinator, setGrantCoordinator] = useState(true);
  const [grantDonor, setGrantDonor] = useState(false);
  const [grantVolunteer, setGrantVolunteer] = useState(true);

  const loadInviteList = async () => {
    setLoading(true);
    try {
      const data = await listInvitations();
      setInvitations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load invitations", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInviteList();
  }, []);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await createInvitation({
        email,
        grant_coordinator: grantCoordinator,
        grant_donor: grantDonor,
        grant_volunteer: grantVolunteer,
      });
      setShowModal(false);
      setEmail("");
      await loadInviteList();
    } catch (err: any) {
      setError(err?.message || "Failed to create invitation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    if (!confirm("Are you sure you want to revoke this invitation?")) return;
    try {
      await revokeInvitation(inviteId);
      await loadInviteList();
    } catch (err) {
      console.error("Failed to revoke invitation", err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400">
              System Administration
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Mail className="text-purple-400" size={24} />
            Coordinator & Partner Invitations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Issue sign-up invitations with pre-configured coordinator, donor, or volunteer capabilities.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 text-xs font-bold shadow-lg shadow-purple-600/20 transition-all"
        >
          <Plus size={16} /> Create Invitation
        </button>
      </div>

      <Panel dark title={`Issued Invitations (${invitations.length})`}>
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading invitations...</div>
        ) : invitations.length === 0 ? (
          <EmptyState icon={Mail}>
            <p className="font-semibold text-slate-300">No invitations issued yet</p>
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Invite ID</th>
                  <th className="px-4 py-3">Target Email</th>
                  <th className="px-4 py-3">Pre-granted Capabilities</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {invitations.map((inv) => (
                  <tr key={inv.invite_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-purple-400">{inv.invite_id}</td>
                    <td className="px-4 py-3 font-semibold text-white">{inv.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {inv.granted_capabilities?.is_coordinator && (
                          <span className="rounded bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.5 text-[10px] font-bold">
                            Coordinator
                          </span>
                        )}
                        {inv.granted_capabilities?.is_donor && (
                          <span className="rounded bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 text-[10px] font-bold">
                            Donor
                          </span>
                        )}
                        {inv.granted_capabilities?.is_volunteer && (
                          <span className="rounded bg-sky-950 text-sky-300 border border-sky-800 px-1.5 py-0.5 text-[10px] font-bold">
                            Volunteer
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status || "PENDING"} />
                    </td>
                    <td className="px-4 py-3">
                      {inv.status === "PENDING" && (
                        <button
                          onClick={() => handleRevoke(inv.invite_id)}
                          className="text-rose-400 hover:text-rose-300 font-semibold text-xs hover:underline"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Create Invite Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Mail className="text-purple-400" size={20} />
                Send Invitation & Grant Roles
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
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Invitee Email Address</label>
                <input
                  type="email"
                  placeholder="coordinator@partner-org.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold uppercase text-slate-400">Pre-grant Roles on Sign-up:</label>

                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={grantCoordinator}
                    onChange={(e) => setGrantCoordinator(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Grant Coordinator Operations Access</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={grantVolunteer}
                    onChange={(e) => setGrantVolunteer(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-sky-600 focus:ring-sky-500"
                  />
                  <span>Grant Volunteer Access</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={grantDonor}
                    onChange={(e) => setGrantDonor(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Grant Donor Access</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
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
                  className="rounded-xl bg-purple-600 hover:bg-purple-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 disabled:opacity-50"
                >
                  {submitting ? "Sending..." : "Create & Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
