"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UserCheck, Search, ShieldAlert, Trash2, X,
  RefreshCw, UserMinus, UserPlus
} from "lucide-react";
import {
  Panel, StatusBadge, EmptyState, ConfirmModal, CopyButton, Spinner,
  Table, SkeletonRow, Badge, Button, Input, StatCard
} from "../../../../components/ui";
import { listUsers, updateUser, deleteUser, UserProfile } from "../../../../lib/api";

type ActionKey = "is_coordinator" | "is_donor" | "is_volunteer" | "is_active";

interface PendingAction {
  userId: string;
  key: ActionKey;
  currentValue: boolean;
  label: string;
}

const TABLE_COLUMNS = ["User Profile", "Email", "Coordinator", "Donor", "Volunteer", "Status", "Actions"];

export default function OpsAdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [deletePending, setDeletePending] = useState<{ userId: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };
  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  };

  const loadUserList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      showError("Failed to load user accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUserList(); }, [loadUserList]);

  const handleToggleCapability = async () => {
    if (!pendingAction) return;
    setConfirmLoading(true);
    try {
      await updateUser(pendingAction.userId, { [pendingAction.key]: !pendingAction.currentValue });
      await loadUserList();
      showSuccess(`${pendingAction.label} updated successfully`);
    } catch {
      showError("Failed to update user role");
    } finally {
      setConfirmLoading(false);
      setPendingAction(null);
    }
  };

  const handleDelete = async () => {
    if (!deletePending) return;
    setDeleteLoading(true);
    try {
      await deleteUser(deletePending.userId);
      await loadUserList();
      showSuccess(`User "${deletePending.name}" deleted`);
    } catch {
      showError("Failed to delete user");
    } finally {
      setDeleteLoading(false);
      setDeletePending(null);
    }
  };

  const requestToggle = (
    u: UserProfile,
    key: ActionKey,
    label: string
  ) => {
    setPendingAction({ userId: u.user_id, key, currentValue: (u as any)[key], label });
  };

  const filtered = users.filter(
    (u) =>
      (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.user_id || "").toLowerCase().includes(search.toLowerCase())
  );

  const RoleToggle = ({
    active,
    grantLabel,
    revokeLabel,
    tone,
    onClick
  }: {
    active: boolean;
    grantLabel: string;
    revokeLabel: string;
    tone: "blue" | "green" | "purple";
    onClick: () => void;
  }) => {
    if (!active) {
      return (
        <button
          onClick={onClick}
          className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
        >
          {grantLabel}
        </button>
      );
    }
    return (
      <button onClick={onClick} className="transition-opacity hover:opacity-80">
        <Badge tone={tone}>{revokeLabel}</Badge>
      </button>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100 font-sans">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            System Administration
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500 dark:bg-sky-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <UserCheck className="text-sky-600 dark:text-sky-400 shrink-0" size={24} />
          User &amp; Role Capability Management
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
          Grant coordinator privileges, manage role flags, activate or deactivate accounts.
        </p>
      </div>

      {/* Status messages */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-500/40 dark:text-emerald-300 animate-fade-in">
          <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/60 dark:border-rose-500/40 dark:text-rose-300 animate-fade-in">
          <ShieldAlert size={16} />
          {errorMsg}
        </div>
      )}

      {/* Search + refresh */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
          <Input
            type="search"
            placeholder="Search users by name, email, or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-10"
            aria-label="Search users"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <Button
          variant="secondary"
          onClick={loadUserList}
          disabled={loading}
          title="Refresh user list"
          aria-label="Refresh user list"
          className="!px-2.5 !py-2.5"
        >
          {loading ? <Spinner size="sm" color="slate" /> : <RefreshCw size={16} />}
        </Button>
      </div>

      {/* Stats row */}
      {!loading && users.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard title="Total Users" value={users.length} accentColor="flood" />
          <StatCard title="Coordinators" value={users.filter(u => u.is_coordinator).length} accentColor="sky" />
          <StatCard title="Volunteers" value={users.filter(u => u.is_volunteer).length} accentColor="sky" />
          <StatCard title="Active" value={users.filter(u => u.is_active).length} accentColor="sky" />
        </div>
      )}

      {/* Main table */}
      <Panel title={`Registered Accounts ${filtered.length < users.length ? `(${filtered.length} of ${users.length})` : `(${users.length})`}`}>
        {loading ? (
          <Table columns={TABLE_COLUMNS}>
            {[...Array(5)].map((_, i) => <SkeletonRow key={i} columns={TABLE_COLUMNS.length} />)}
          </Table>
        ) : filtered.length === 0 ? (
          <EmptyState icon={UserCheck}>
            <p className="font-semibold">No matching user accounts</p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-2 text-xs text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 underline"
              >
                Clear search
              </button>
            )}
          </EmptyState>
        ) : (
          <Table columns={TABLE_COLUMNS}>
            {filtered.map((u) => (
              <tr key={u.user_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                {/* Profile */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-sky-100 border border-sky-200 dark:bg-sky-900/60 dark:border-sky-700/60 flex items-center justify-center font-bold text-sky-700 dark:text-sky-300 text-xs">
                      {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]">{u.name || "Member"}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <p className="text-[10px] text-slate-500 font-mono truncate max-w-[80px]">
                          {u.user_id.slice(0, 8)}…
                        </p>
                        <CopyButton text={u.user_id} />
                      </div>
                    </div>
                  </div>
                </td>

                {/* Email */}
                <td className="px-4 py-3 max-w-[180px]">
                  <span className="truncate block text-slate-600 dark:text-slate-300 text-xs" title={u.email || ""}>
                    {u.email}
                  </span>
                </td>

                {/* Coordinator toggle */}
                <td className="px-4 py-3">
                  <RoleToggle
                    active={u.is_coordinator}
                    grantLabel="+ Grant"
                    revokeLabel="✓ Coordinator"
                    tone="blue"
                    onClick={() => requestToggle(u, "is_coordinator", `Coordinator for ${u.name}`)}
                  />
                </td>

                {/* Donor toggle */}
                <td className="px-4 py-3">
                  <RoleToggle
                    active={u.is_donor}
                    grantLabel="+ Grant"
                    revokeLabel="✓ Donor"
                    tone="green"
                    onClick={() => requestToggle(u, "is_donor", `Donor for ${u.name}`)}
                  />
                </td>

                {/* Volunteer toggle */}
                <td className="px-4 py-3">
                  <RoleToggle
                    active={u.is_volunteer}
                    grantLabel="+ Grant"
                    revokeLabel="✓ Volunteer"
                    tone="purple"
                    onClick={() => requestToggle(u, "is_volunteer", `Volunteer for ${u.name}`)}
                  />
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <StatusBadge status={u.is_active ? "Active" : "Disabled"} />
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => requestToggle(u, "is_active", `${u.is_active ? "Deactivate" : "Activate"} ${u.name}`)}
                      title={u.is_active ? "Deactivate account" : "Activate account"}
                      aria-label={u.is_active ? "Deactivate account" : "Activate account"}
                      className={`p-1.5 rounded-lg transition-colors text-[11px] font-bold flex items-center gap-1 ${
                        u.is_active
                          ? "text-amber-600 hover:bg-amber-50 hover:text-amber-500 dark:text-amber-400 dark:hover:bg-amber-900/30 dark:hover:text-amber-300"
                          : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300"
                      }`}
                    >
                      {u.is_active ? <UserMinus size={14} /> : <UserPlus size={14} />}
                    </button>
                    <button
                      onClick={() => setDeletePending({ userId: u.user_id, name: u.name || "this user" })}
                      title="Delete user account"
                      aria-label="Delete user account"
                      className="p-1.5 rounded-lg text-rose-600 hover:text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      {/* Confirm role toggle modal */}
      <ConfirmModal
        open={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={handleToggleCapability}
        title="Update Role"
        loading={confirmLoading}
        confirmLabel="Confirm"
        confirmClass="bg-sky-600 hover:bg-sky-500 text-white"
        message={
          pendingAction
            ? `${pendingAction.currentValue ? "Revoke" : "Grant"} ${pendingAction.label}?`
            : ""
        }
      />

      {/* Confirm delete modal */}
      <ConfirmModal
        open={!!deletePending}
        onClose={() => setDeletePending(null)}
        onConfirm={handleDelete}
        title="Delete User Account"
        loading={deleteLoading}
        confirmLabel="Delete Account"
        confirmClass="bg-rose-600 hover:bg-rose-500 text-white"
        message={
          deletePending ? (
            <span>
              Are you sure you want to permanently delete <strong>{deletePending.name}</strong>?
              This action cannot be undone.
            </span>
          ) : ""
        }
      />
    </div>
  );
}
