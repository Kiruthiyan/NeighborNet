"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../../../components/AppShell";
import { Badge, EmptyState, Table } from "../../../components/ui";
import { useAuth } from "../../../lib/auth";
import { deleteUser, listUsers, updateUser, type UserProfile } from "../../../lib/api";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  async function load() {
    try {
      setUsers(await listUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleCoordinator(target: UserProfile) {
    setBusyUserId(target.user_id);
    setError(null);
    try {
      const updated = await updateUser(target.user_id, {
        is_coordinator: !target.is_coordinator
      });
      setUsers((prev) => prev?.map((u) => (u.user_id === updated.user_id ? updated : u)) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyUserId(null);
    }
  }

  async function toggleActive(target: UserProfile) {
    setBusyUserId(target.user_id);
    setError(null);
    try {
      const updated = await updateUser(target.user_id, { is_active: !target.is_active });
      setUsers((prev) => prev?.map((u) => (u.user_id === updated.user_id ? updated : u)) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyUserId(null);
    }
  }

  async function remove(target: UserProfile) {
    if (!window.confirm(`Delete ${target.name}'s account? This cannot be undone.`)) return;
    setBusyUserId(target.user_id);
    setError(null);
    try {
      await deleteUser(target.user_id);
      setUsers((prev) => prev?.filter((u) => u.user_id !== target.user_id) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <AppShell
      description="Grant or revoke coordinator access, deactivate or delete accounts."
      requireAdmin
      title="Manage Users"
    >
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      {!users && <EmptyState>Loading users…</EmptyState>}
      {users && users.length === 0 && <EmptyState>No users yet.</EmptyState>}

      {users && users.length > 0 && (
        <Table columns={["Name", "Email", "Capabilities", "Status", "Actions"]}>
          {users.map((u) => (
            <tr key={u.user_id}>
              <td className="px-4 py-3">{u.name}</td>
              <td className="px-4 py-3 text-slate-500">{u.email ?? "—"}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {u.is_admin && <Badge tone="green">Admin</Badge>}
                  {u.is_coordinator && !u.is_admin && <Badge tone="green">Coordinator</Badge>}
                  {u.is_donor && <Badge>Donor</Badge>}
                  {u.is_volunteer && <Badge>Volunteer</Badge>}
                  {!u.is_admin && !u.is_coordinator && !u.is_donor && !u.is_volunteer && (
                    <Badge>Recipient</Badge>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge tone={u.is_active ? "green" : "red"}>
                  {u.is_active ? "Active" : "Deactivated"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {u.is_admin ? (
                  <span className="text-xs text-slate-400">Admin account</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                      disabled={busyUserId === u.user_id}
                      onClick={() => toggleCoordinator(u)}
                      type="button"
                    >
                      {u.is_coordinator ? "Revoke coordinator" : "Grant coordinator"}
                    </button>
                    <button
                      className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                      disabled={busyUserId === u.user_id}
                      onClick={() => toggleActive(u)}
                      type="button"
                    >
                      {u.is_active ? "Deactivate" : "Reactivate"}
                    </button>
                    {u.user_id !== currentUser?.user_id && (
                      <button
                        className="rounded border border-danger/40 px-2 py-1 text-xs text-danger hover:bg-red-50 disabled:opacity-50"
                        disabled={busyUserId === u.user_id}
                        onClick={() => remove(u)}
                        type="button"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </AppShell>
  );
}
