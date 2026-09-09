import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  LucideIcon,
  Package,
  Route,
  ShieldCheck,
  Truck,
  Users
} from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { CapabilityPanel } from "../../components/CapabilityPanel";
import { Badge, EmptyState, Panel, StatCard, riskTone } from "../../components/ui";
import { label } from "../../lib/format";
import { getAlerts, getDashboardMetrics, getDisasterOverview, getTasks } from "../../lib/api";

export const dynamic = "force-dynamic";

const boardColumns = ["available", "accepted", "assigned", "in_progress", "completed", "needs_attention"];

export default async function DashboardPage() {
  const [metrics, disaster, tasks, alerts] = await Promise.all([
    getDashboardMetrics(),
    getDisasterOverview(),
    getTasks(),
    getAlerts()
  ]);

  const metricCards: Array<[string, string | number, LucideIcon]> = [
    ["Community Readiness", `${metrics.community_readiness}%`, ShieldCheck],
    ["Active Requests", metrics.active_requests, ClipboardList],
    ["Inventory", metrics.inventory_batches, Package],
    ["Active Volunteers", metrics.active_volunteers, Users],
    ["Active Tasks", metrics.active_tasks, Route],
    ["Human Decisions Avoided", metrics.human_decisions_avoided, CheckCircle2]
  ];

  return (
    <AppShell
      description="Normal food recovery and disaster volunteer dispatch share the same resources, tasks, recovery engine, and audit trail."
      title="Unified Coordination Dashboard"
    >
      <div className="mb-5 flex items-center gap-2 rounded border border-flood/25 bg-white px-3 py-2 text-sm text-flood">
        <Activity size={17} />
        <span>Normal + Disaster Mode</span>
        {metrics.pending_human_decisions > 0 && (
          <span className="ml-auto">
            <Badge tone="amber">{metrics.pending_human_decisions} pending decisions</Badge>
          </span>
        )}
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metricCards.map(([title, value, Icon]) => (
          <StatCard icon={Icon} key={String(title)} title={title} value={value} />
        ))}
      </section>

      <section className="mt-5">
        <CapabilityPanel />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel icon={AlertTriangle} iconClassName="text-alert" title="Disaster Overview">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Nearby Volunteers", disaster.nearby_volunteers],
              ["Alerted", disaster.volunteers_alerted],
              ["Accepted", disaster.volunteers_accepted],
              ["Assigned", disaster.tasks_assigned],
              ["Completed", disaster.tasks_completed],
              ["Unresolved", disaster.unresolved_tasks],
              ["Recovery Actions", disaster.recovery_actions],
              ["Pending Decisions", metrics.pending_human_decisions]
            ].map(([title, value]) => (
              <div className="rounded border border-slate-200 bg-slate-50 p-3" key={String(title)}>
                <div className="text-xs text-slate-500">{title}</div>
                <div className="mt-1 text-xl font-semibold">{String(value)}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel icon={Users} iconClassName="text-leaf" title="Volunteer Response">
          <div className="grid gap-2">
            {alerts.slice(0, 6).map((alert) => (
              <div
                className="grid grid-cols-[1fr_auto] gap-3 rounded border border-slate-200 p-3"
                key={alert.alert_id}
              >
                <div>
                  <div className="text-sm font-medium">{alert.volunteer_id}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {label(alert.task_category)} · {alert.approximate_distance} mi
                  </div>
                </div>
                <Badge tone={alert.status === "declined" ? "neutral" : "green"}>
                  {label(alert.status)}
                </Badge>
              </div>
            ))}
            {alerts.length === 0 && (
              <EmptyState>No alerts yet. Run the flood demo or dispatch a disaster.</EmptyState>
            )}
          </div>
        </Panel>
      </section>

      <section className="mt-5">
        <Panel icon={Truck} iconClassName="text-flood" title="Active Plan / Task Board">
          <div className="grid gap-3 xl:grid-cols-5">
            {boardColumns.map((column) => (
              <div className="min-h-48 rounded border border-slate-200 bg-slate-50 p-3" key={column}>
                <div className="mb-3 text-xs font-semibold uppercase text-slate-500">
                  {label(column)}
                </div>
                <div className="grid gap-2">
                  {tasks
                    .filter((task) => task.status === column)
                    .slice(0, 4)
                    .map((task) => (
                      <article className="rounded border border-slate-200 bg-white p-3" key={task.task_id}>
                        <div className="text-sm font-medium">{task.title}</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <Badge>{label(task.operating_mode)}</Badge>
                          <Badge>{label(task.priority)}</Badge>
                          <Badge tone={riskTone(task.risk_classification)}>
                            {label(task.risk_classification)}
                          </Badge>
                        </div>
                      </article>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </AppShell>
  );
}
