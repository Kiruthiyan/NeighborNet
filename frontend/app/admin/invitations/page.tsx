"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AppShell } from "../../../components/AppShell";
import { Badge, EmptyState, Panel, Table } from "../../../components/ui";
import {
  createInvitation,
  listInvitations,
  revokeInvitation,
  type Invitation
} from "../../../lib/api";

function statusTone(status: string): "green" | "amber" | "red" | "neutral" {
  if (status === "accepted") return "green";
  if (status === "pending") return "amber";
  if (status === "revoked" || status === "expired") return "red";
  return "neutral";
}

export default function AdminInvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [email, setEmail] = useState("");
  const [grantCoordinator, setGrantCoordinator] = useState(false);
  const [grantDonor, setGrantDonor] = useState(false);
  const [grantVolunteer, setGrantVolunteer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  async function load() {
    try {
      setInvitations(await listInvitations());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invitations");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const invitation = await createInvitation({
        email,
        grant_coordinator: grantCoordinator,
        grant_donor: grantDonor,
        grant_volunteer: grantVolunteer
      });
      setInvitations((prev) => [invitation, ...(prev ?? [])]);
      setEmail("");
      setGrantCoordinator(false);
      setGrantDonor(false);
      setGrantVolunteer(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invitation");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(invitation: Invitation) {
    setBusy(true);
    setError(null);
    try {
      const updated = await revokeInvitation(invitation.invite_id);
      setInvitations(
        (prev) => prev?.map((i) => (i.invite_id === updated.invite_id ? updated : i)) ?? null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke invitation");
    } finally {
      setBusy(false);
    }
  }

  function signupUrl(invitation: Invitation): string {
    if (typeof window === "undefined") return invitation.signup_url_path;
    return `${window.location.origin}${invitation.signup_url_path}`;
  }

  async function copyLink(invitation: Invitation) {
    try {
      await navigator.clipboard.writeText(signupUrl(invitation));
      setCopiedToken(invitation.token);
      setTimeout(() => setCopiedToken(null), 1500);
    } catch {
      // Clipboard API unavailable - the link is still visible to copy by hand.
    }
  }

  return (
    <AppShell
      description="Invite someone by email. There's no automated email send yet - copy the signup link and share it yourself."
      requireAdmin
      title="Invitations"
    >
      <Panel title="Invite someone">
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="text-slate-600">Email</span>
            <input
              className="rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-leaf"
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
            <label className="flex items-center gap-2">
              <input
                checked={grantCoordinator}
                onChange={(e) => setGrantCoordinator(e.target.checked)}
                type="checkbox"
              />
              Grant coordinator
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={grantDonor}
                onChange={(e) => setGrantDonor(e.target.checked)}
                type="checkbox"
              />
              Grant donor
            </label>
            <label className="flex items-center gap-2">
              <input
                checked={grantVolunteer}
                onChange={(e) => setGrantVolunteer(e.target.checked)}
                type="checkbox"
              />
              Grant volunteer
            </label>
          </div>
          {error && <p className="text-sm text-danger sm:col-span-2">{error}</p>}
          <button
            className="justify-self-start rounded bg-leaf px-3 py-2 text-sm font-medium text-white hover:bg-leaf/90 disabled:opacity-50 sm:col-span-2"
            disabled={busy}
            type="submit"
          >
            {busy ? "Sending…" : "Create invitation"}
          </button>
        </form>
      </Panel>

      <div className="mt-5">
        {!invitations && <EmptyState>Loading invitations…</EmptyState>}
        {invitations && invitations.length === 0 && <EmptyState>No invitations yet.</EmptyState>}
        {invitations && invitations.length > 0 && (
          <Table columns={["Email", "Granted", "Status", "Link", "Actions"]}>
            {invitations.map((invitation) => (
              <tr key={invitation.invite_id}>
                <td className="px-4 py-3">{invitation.email}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {invitation.granted_capabilities.is_coordinator && (
                      <Badge tone="green">Coordinator</Badge>
                    )}
                    {invitation.granted_capabilities.is_donor && <Badge>Donor</Badge>}
                    {invitation.granted_capabilities.is_volunteer && <Badge>Volunteer</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone(invitation.status)}>{invitation.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <button
                    className="rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                    onClick={() => copyLink(invitation)}
                    type="button"
                  >
                    {copiedToken === invitation.token ? "Copied!" : "Copy signup link"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  {invitation.status === "pending" && (
                    <button
                      className="rounded border border-danger/40 px-2 py-1 text-xs text-danger hover:bg-red-50 disabled:opacity-50"
                      disabled={busy}
                      onClick={() => revoke(invitation)}
                      type="button"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </AppShell>
  );
}
