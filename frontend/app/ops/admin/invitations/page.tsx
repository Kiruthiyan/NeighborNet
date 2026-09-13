"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail, Plus, X, AlertCircle, RefreshCw
} from "lucide-react";
import {
  Panel, StatusBadge, EmptyState, ConfirmModal, CopyButton, Spinner,
  Table, SkeletonRow, Badge, Button, Input
} from "../../../../components/ui";
import {
  listInvitations, createInvitation, revokeInvitation, Invitation
} from "../../../../lib/api";

const TABLE_COLUMNS = ["Invite ID", "Target Email", "Capabilities", "Delivery", "Status", "Actions"];

export default function OpsAdminInvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [grantCoordinator, setGrantCoordinator] = useState(true);
  const [grantDonor, setGrantDonor] = useState(false);
  const [grantVolunteer, setGrantVolunteer] = useState(true);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const loadInviteList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listInvitations();
      setInvitations(Array.isArray(data) ? data : []);
    } catch {
      // silently degrade
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInviteList(); }, [loadInviteList]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createInvitation({
        email,
        grant_coordinator: grantCoordinator,
        grant_donor: grantDonor,
        grant_volunteer: grantVolunteer
      });
      setShowModal(false);
      setEmail("");
      setGrantCoordinator(true);
      setGrantDonor(false);
      setGrantVolunteer(true);
      await loadInviteList();
      showSuccess(`Invitation sent to ${email}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create invitation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevokeLoading(true);
    try {
      await revokeInvitation(revokeTarget.invite_id);
      await loadInviteList();
      showSuccess("Invitation revoked");
    } catch {
      // handled by ConfirmModal staying open
    } finally {
      setRevokeLoading(false);
      setRevokeTarget(null);
    }
  };

  const getSignupUrl = (inv: Invitation) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}${inv.signup_url_path}`;
  };

  const RoleChip = ({ label, tone }: { label: string; tone: "blue" | "green" | "purple" }) => (
    <Badge tone={tone}>{label}</Badge>
  );

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100 font-sans">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              System Administration
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500 dark:bg-sky-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Mail className="text-sky-600 dark:text-sky-400 shrink-0" size={24} />
            Coordinator &amp; Partner Invitations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Issue sign-up invitations with pre-configured coordinator, donor, or volunteer capabilities.
            Recipients can sign up without an admin action.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="md"
            onClick={loadInviteList}
            disabled={loading}
            title="Refresh"
            className="!px-2.5 !py-2.5"
          >
            {loading ? <Spinner size="sm" color="slate" /> : <RefreshCw size={16} />}
          </Button>
          <Button variant="primary" size="md" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Create Invitation
          </Button>
        </div>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-500/40 dark:text-emerald-300 animate-fade-in">
          <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Invitations table */}
      <Panel title={`Issued Invitations (${invitations.length})`}>
        {loading ? (
          <Table columns={TABLE_COLUMNS}>
            {[...Array(4)].map((_, i) => <SkeletonRow key={i} columns={TABLE_COLUMNS.length} />)}
          </Table>
        ) : invitations.length === 0 ? (
          <EmptyState icon={Mail}>
            <p className="font-semibold text-slate-700 dark:text-slate-300">No invitations issued yet</p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Create an invitation to onboard coordinators with pre-configured roles</p>
            <Button variant="primary" size="sm" className="mt-3" onClick={() => setShowModal(true)}>
              <Plus size={13} /> Create First Invitation
            </Button>
          </EmptyState>
        ) : (
          <Table columns={TABLE_COLUMNS}>
            {invitations.map((inv) => (
              <tr key={inv.invite_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                {/* Invite ID — truncated + copyable */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-sky-600 dark:text-sky-300">
                      {inv.invite_id.slice(0, 8)}…
                    </span>
                    <CopyButton text={inv.invite_id} />
                  </div>
                </td>

                {/* Email */}
                <td className="px-4 py-3 max-w-[180px]">
                  <span className="truncate block font-semibold text-slate-900 dark:text-white" title={inv.email}>
                    {inv.email}
                  </span>
                </td>

                {/* Capabilities */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {inv.granted_capabilities?.is_coordinator && (
                      <RoleChip label="Coordinator" tone="blue" />
                    )}
                    {inv.granted_capabilities?.is_donor && (
                      <RoleChip label="Donor" tone="green" />
                    )}
                    {inv.granted_capabilities?.is_volunteer && (
                      <RoleChip label="Volunteer" tone="purple" />
                    )}
                    {!inv.granted_capabilities?.is_coordinator &&
                      !inv.granted_capabilities?.is_donor &&
                      !inv.granted_capabilities?.is_volunteer && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-500 italic">None</span>
                      )}
                  </div>
                </td>

                {/* Delivery (email_sent) */}
                <td className="px-4 py-3">
                  <StatusBadge status={inv.email_sent ? "Emailed" : "Link only"} />
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <StatusBadge status={inv.status || "Pending"} />
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <CopyButton text={getSignupUrl(inv)} label="Copy link" />
                    {inv.status === "PENDING" && (
                      <button
                        onClick={() => setRevokeTarget(inv)}
                        className="text-rose-600 hover:text-rose-500 dark:text-rose-400 dark:hover:text-rose-300 font-semibold text-[11px] px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      {/* Create Invite Modal — styled to match ConfirmModal's card treatment */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-modal-title"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-transparent dark:border-slate-700 shadow-2xl animate-slide-up">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
              <h3 id="invite-modal-title" className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Mail className="text-sky-600 dark:text-sky-400" size={20} />
                Create &amp; Send Invitation
              </h3>
              <button
                onClick={() => setShowModal(false)}
                aria-label="Close modal"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5">
              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/60 dark:border-rose-500/40 p-3 text-sm text-rose-700 dark:text-rose-300">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateInvite} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">
                    Invitee Email Address *
                  </label>
                  <Input
                    type="email"
                    placeholder="coordinator@partner-org.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full"
                    required
                    autoComplete="email"
                  />
                </div>

                {/* Role checkboxes */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                    Pre-grant Roles on Sign-up
                  </label>
                  <div className="space-y-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4">
                    {[
                      {
                        key: "coordinator",
                        label: "Coordinator — Operations portal access",
                        checked: grantCoordinator,
                        onChange: setGrantCoordinator,
                        color: "text-sky-700 dark:text-sky-300",
                        ring: "focus:ring-sky-500"
                      },
                      {
                        key: "volunteer",
                        label: "Volunteer — Task acceptance &amp; dispatch",
                        checked: grantVolunteer,
                        onChange: setGrantVolunteer,
                        color: "text-indigo-700 dark:text-indigo-300",
                        ring: "focus:ring-indigo-500"
                      },
                      {
                        key: "donor",
                        label: "Donor — Resource donation listing",
                        checked: grantDonor,
                        onChange: setGrantDonor,
                        color: "text-emerald-700 dark:text-emerald-300",
                        ring: "focus:ring-emerald-500"
                      }
                    ].map((item) => (
                      <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) => item.onChange(e.target.checked)}
                          className={`mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 ${item.ring}`}
                        />
                        <span className={`text-sm ${item.color} group-hover:brightness-110 transition-all`}
                          dangerouslySetInnerHTML={{ __html: item.label }}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-1">
                  <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" loading={submitting} disabled={submitting || !email}>
                    {submitting ? "Sending…" : "Create & Send Invitation"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Revoke confirmation modal */}
      <ConfirmModal
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Revoke Invitation"
        loading={revokeLoading}
        confirmLabel="Revoke"
        confirmClass="bg-rose-600 hover:bg-rose-500 text-white"
        message={
          revokeTarget
            ? <span>Revoke the invitation sent to <strong>{revokeTarget.email}</strong>? The signup link will stop working.</span>
            : ""
        }
      />
    </div>
  );
}
