"use client";

import { HandHeart, ShieldQuestion, Truck } from "lucide-react";
import { useState } from "react";
import { Panel } from "./ui";
import { useAuth } from "../lib/auth";
import { updateMyCapabilities } from "../lib/api";

function ToggleRow({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
  busy
}: {
  icon: typeof HandHeart;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  busy: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded border border-slate-200 p-3">
      <Icon className="text-leaf" size={20} />
      <div className="flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
      <button
        aria-pressed={enabled}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          enabled ? "bg-leaf" : "bg-slate-300"
        }`}
        disabled={busy}
        onClick={onToggle}
        type="button"
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

/** Recipient-first dashboard panel: every account is always a recipient, and
 * can self-toggle donor/volunteer here. Coordinator is admin-granted only -
 * see docs/AUTH_PLAN.md - so it's shown as a note, not a toggle. */
export function CapabilityPanel() {
  const { user, setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function toggle(field: "is_donor" | "is_volunteer") {
    setBusy(true);
    setError(null);
    try {
      const updated = await updateMyCapabilities({ [field]: !user![field] });
      setUser(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update capabilities");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Your Account">
      <p className="mb-3 text-sm text-slate-600">
        Every account can request help. Opt in below to also donate resources or volunteer -
        you can turn these off any time.
      </p>
      <div className="grid gap-2">
        <ToggleRow
          busy={busy}
          description="List surplus food or supplies for pickup."
          enabled={user.is_donor}
          icon={HandHeart}
          onToggle={() => toggle("is_donor")}
          title="Donor"
        />
        <ToggleRow
          busy={busy}
          description="Accept alerts and deliver requests."
          enabled={user.is_volunteer}
          icon={Truck}
          onToggle={() => toggle("is_volunteer")}
          title="Volunteer"
        />
        <div className="flex items-center gap-3 rounded border border-dashed border-slate-300 p-3 text-slate-500">
          <ShieldQuestion size={20} />
          <div className="flex-1 text-xs">
            {user.is_coordinator
              ? "You have coordinator access, granted by an admin."
              : "Coordinator access approves disaster response and risky actions - it's granted by an admin, not self-service."}
          </div>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </Panel>
  );
}
