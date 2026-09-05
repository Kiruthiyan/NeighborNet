"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  acceptAlert,
  approveDecision,
  assignDisasterTasks,
  createDisaster,
  declineAlert,
  dispatchDisaster,
  generateNormalTask,
  injectDisruption,
  rejectDecision
} from "../lib/api";

function ActionButton({
  onClick,
  tone = "primary",
  children
}: {
  onClick: () => Promise<unknown>;
  tone?: "primary" | "danger" | "ghost";
  children: ReactNode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toneClass =
    tone === "primary"
      ? "bg-leaf text-white hover:bg-leaf/90"
      : tone === "danger"
        ? "bg-white text-danger border border-danger/40 hover:bg-red-50"
        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50";

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        className={`rounded px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${toneClass}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await onClick();
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Action failed");
          } finally {
            setBusy(false);
          }
        }}
        type="button"
      >
        {busy ? "Working…" : children}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

export function AlertActions({ alertId, status }: { alertId: string; status: string }) {
  if (status !== "pending") {
    return <span className="text-xs text-slate-400">No action needed</span>;
  }
  return (
    <div className="flex gap-2">
      <ActionButton onClick={() => acceptAlert(alertId)}>Accept</ActionButton>
      <ActionButton onClick={() => declineAlert(alertId)} tone="ghost">
        Decline
      </ActionButton>
    </div>
  );
}

export function DecisionActions({ decisionId }: { decisionId: string }) {
  return (
    <div className="flex gap-2">
      <ActionButton onClick={() => approveDecision(decisionId)}>Approve</ActionButton>
      <ActionButton onClick={() => rejectDecision(decisionId)} tone="danger">
        Reject
      </ActionButton>
    </div>
  );
}

export function GenerateNormalTaskButton() {
  return <ActionButton onClick={() => generateNormalTask()}>Generate Normal Task</ActionButton>;
}

export function DispatchDisasterButton({ disasterId }: { disasterId: string }) {
  return <ActionButton onClick={() => dispatchDisaster(disasterId)}>Alert Volunteers</ActionButton>;
}

export function AssignDisasterTasksButton({ disasterId }: { disasterId: string }) {
  return (
    <ActionButton onClick={() => assignDisasterTasks(disasterId)}>Assign Accepted Volunteers</ActionButton>
  );
}

export function InjectDisruptionButton({
  taskIds,
  reason
}: {
  taskIds: string[];
  reason: string;
}) {
  return (
    <ActionButton
      onClick={() =>
        injectDisruption({
          task_ids: taskIds,
          reason,
          route_status: "blocked"
        })
      }
      tone="danger"
    >
      Simulate Disruption
    </ActionButton>
  );
}

export function CreateFloodDemoButton() {
  return (
    <ActionButton
      onClick={() =>
        createDisaster({
          type: "flood",
          title: "Flood detected in Zone B",
          description: "High-water warning near Zone B with relief logistics needs.",
          affected_zones: ["south"],
          severity: "high",
          needs: [
            {
              category: "food_delivery",
              quantity: 20,
              priority: "high",
              required_skills: ["food_delivery", "driving"],
              required_capacity: 20
            }
          ]
        })
      }
    >
      Create Flood Event (Demo)
    </ActionButton>
  );
}
