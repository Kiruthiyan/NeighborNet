import { Truck } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Badge, EmptyState, riskTone } from "../../components/ui";
import { getTasks } from "../../lib/api";
import { label } from "../../lib/format";

export const dynamic = "force-dynamic";

const boardColumns = ["available", "accepted", "assigned", "in_progress", "completed", "needs_attention", "failed"];

export default async function DisasterTaskBoardPage() {
  const tasks = await getTasks();
  const disasterTasks = tasks.filter((task) => task.operating_mode === "disaster");

  return (
    <AppShell
      description="Only disaster-mode tasks, grouped by lifecycle status. A volunteer accepting an alert never lands a task here directly — assignment is a separate deterministic step."
      title="Disaster Task Board"
    >
      <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
        <Truck size={14} />
        <span>{disasterTasks.length} disaster tasks.</span>
      </div>

      {disasterTasks.length === 0 ? (
        <EmptyState>No disaster tasks yet. Dispatch and assign a disaster first.</EmptyState>
      ) : (
        <div className="grid gap-3 xl:grid-cols-7">
          {boardColumns.map((column) => {
            const columnTasks = disasterTasks.filter((task) => task.status === column);
            return (
              <div className="min-h-56 rounded border border-slate-200 bg-slate-50 p-3" key={column}>
                <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase text-slate-500">
                  <span>{label(column)}</span>
                  <span className="rounded bg-slate-200 px-1.5 text-slate-600">{columnTasks.length}</span>
                </div>
                <div className="grid gap-2">
                  {columnTasks.map((task) => (
                    <article className="rounded border border-slate-200 bg-white p-3" key={task.task_id}>
                      <div className="text-sm font-medium">{task.title}</div>
                      <div className="mt-1 font-mono text-xs text-slate-400">
                        {(task.volunteer_id as string) ?? "Unassigned"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1 text-xs">
                        <Badge>{label(task.priority)}</Badge>
                        <Badge tone={riskTone(task.risk_classification)}>
                          {label(task.risk_classification)}
                        </Badge>
                        <Badge>{label(task.route_status)}</Badge>
                      </div>
                      {Boolean(task.recovery_reason) && (
                        <div className="mt-2 text-xs text-alert">Recovered: {String(task.recovery_reason)}</div>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
