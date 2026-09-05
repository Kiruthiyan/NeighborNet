import { Route } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { GenerateNormalTaskButton } from "../../components/actions";
import { Badge, EmptyState, Table, riskTone } from "../../components/ui";
import { getTasks } from "../../lib/api";
import { formatDate, label } from "../../lib/format";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const tasks = await getTasks();

  return (
    <AppShell
      description="The unified plan: every deterministically assigned normal-delivery and disaster task, in one lifecycle."
      title="Active Plan / Tasks"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Route size={14} />
          <span>{tasks.length} tasks in the shared coordination state.</span>
        </div>
        <GenerateNormalTaskButton />
      </div>

      {tasks.length === 0 ? (
        <EmptyState>No tasks yet. Generate a normal task or dispatch a disaster.</EmptyState>
      ) : (
        <Table columns={["Task", "Mode", "Category", "Volunteer", "Priority", "Risk", "Route", "Status", "Due"]}>
          {tasks.map((task) => (
            <tr key={task.task_id}>
              <td className="px-4 py-3">
                <div className="text-sm font-medium">{task.title}</div>
                <div className="font-mono text-xs text-slate-400">{task.task_id}</div>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge>{label(task.operating_mode)}</Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3">{label(task.category as string)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                {(task.volunteer_id as string) ?? "Unassigned"}
              </td>
              <td className="whitespace-nowrap px-4 py-3">{label(task.priority)}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge tone={riskTone(task.risk_classification)}>{label(task.risk_classification)}</Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3">{label(task.route_status)}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge tone={task.status === "failed" || task.status === "needs_attention" ? "red" : "neutral"}>
                  {label(task.status)}
                </Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                {formatDate(task.expected_completion_time as string)}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </AppShell>
  );
}
