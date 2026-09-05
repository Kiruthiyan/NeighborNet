"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { injectDisruption, type CoordinationTask } from "../lib/api";
import { label } from "../lib/format";

export function DisruptionForm({ tasks }: { tasks: CoordinationTask[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("Volunteer cancellation and road closure");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(taskId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  async function submit() {
    if (selected.size === 0) {
      setError("Select at least one task to disrupt.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await injectDisruption({
        task_ids: Array.from(selected),
        reason,
        route_status: "blocked",
        create_amber_decision: true
      });
      setResult(response);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to inject disruption");
    } finally {
      setBusy(false);
    }
  }

  const eligible = tasks.filter(
    (task) => task.status === "assigned" || task.status === "in_progress"
  );

  return (
    <div className="rounded border border-slate-200 bg-white p-5">
      <h2 className="mb-1 text-lg font-semibold">Simulate a Disruption</h2>
      <p className="mb-4 text-sm text-slate-600">
        Pick affected tasks (e.g. a volunteer cancellation, a road closure) and run the shared
        recovery engine. Unaffected tasks stay untouched; affected ones are repaired and a
        coordinator decision is raised when the recovery is meaningful.
      </p>

      {eligible.length === 0 ? (
        <p className="text-sm text-slate-500">
          No assigned/in-progress tasks available to disrupt right now.
        </p>
      ) : (
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          {eligible.map((task) => (
            <label
              className="flex items-center gap-2 rounded border border-slate-200 p-2 text-sm"
              key={task.task_id}
            >
              <input
                checked={selected.has(task.task_id)}
                onChange={() => toggle(task.task_id)}
                type="checkbox"
              />
              <span className="truncate">
                {task.title} <span className="text-xs text-slate-400">({label(task.status)})</span>
              </span>
            </label>
          ))}
        </div>
      )}

      <label className="mb-4 block text-sm">
        <span className="mb-1 block text-xs font-medium uppercase text-slate-500">Reason</span>
        <input
          className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
          onChange={(event) => setReason(event.target.value)}
          value={reason}
        />
      </label>

      <button
        className="rounded bg-danger px-4 py-2 text-sm font-medium text-white hover:bg-danger/90 disabled:opacity-50"
        disabled={busy || eligible.length === 0}
        onClick={submit}
        type="button"
      >
        {busy ? "Recovering…" : "Inject Disruption & Recover"}
      </button>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {result && (
        <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-xs">
          <div>Preserved: {String(result.preserved_count ?? 0)}</div>
          <div>Repaired: {String(result.repaired_count ?? 0)}</div>
          <div>Affected: {String(result.affected_count ?? 0)}</div>
          <div className="mt-1 text-slate-500">
            Check the Decisions page — a pending AMBER decision may be waiting for approval.
          </div>
        </div>
      )}
    </div>
  );
}
