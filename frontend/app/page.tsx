import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Package,
  Radio,
  Route,
  ShieldCheck,
  Truck,
  Users
} from "lucide-react";
import {
  getAlerts,
  getDashboardMetrics,
  getDisasterOverview,
  getTasks
} from "../lib/api";

const navItems = [
  "Dashboard",
  "Resources",
  "Requests",
  "Volunteers",
  "Active Plan",
  "Disruptions",
  "Decisions",
  "Activity",
  "Evaluations",
  "Policies"
];

const boardColumns = [
  "available",
  "accepted",
  "assigned",
  "in_progress",
  "completed",
  "needs_attention"
];

function label(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function DashboardPage() {
  const [metrics, disaster, tasks, alerts] = await Promise.all([
    getDashboardMetrics(),
    getDisasterOverview(),
    getTasks(),
    getAlerts()
  ]);

  const metricCards = [
    ["Community Readiness", `${metrics.community_readiness}%`, ShieldCheck],
    ["Active Requests", metrics.active_requests, ClipboardList],
    ["Inventory", metrics.inventory_batches, Package],
    ["Active Volunteers", metrics.active_volunteers, Users],
    ["Active Tasks", metrics.active_tasks, Route],
    ["Human Decisions Avoided", metrics.human_decisions_avoided, CheckCircle2]
  ];

  return (
    <main className="min-h-screen bg-mist text-ink">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[240px_1fr]">
        <aside className="border-b border-slate-200 bg-white px-5 py-4 lg:border-b-0 lg:border-r">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded bg-leaf text-white">
              <Radio size={21} />
            </div>
            <div>
              <div className="text-sm font-semibold">NeighborNet</div>
              <div className="text-xs text-slate-500">Resilience Ops</div>
            </div>
          </div>
          <nav className="grid gap-1">
            {navItems.map((item) => (
              <a
                className="rounded px-3 py-2 text-sm text-slate-600 hover:bg-field hover:text-ink"
                href="#"
                key={item}
              >
                {item}
              </a>
            ))}
          </nav>
        </aside>

        <section className="px-4 py-5 sm:px-6 lg:px-8">
          <header className="mb-5 flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Unified Coordination Dashboard
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                Normal food recovery and disaster volunteer dispatch share the
                same resources, tasks, recovery engine, and audit trail.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded border border-flood/25 bg-white px-3 py-2 text-sm text-flood">
              <Activity size={17} />
              <span>Normal + Disaster Mode</span>
            </div>
          </header>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {metricCards.map(([title, value, Icon]) => (
              <div className="rounded border border-slate-200 bg-white p-4" key={String(title)}>
                <div className="mb-3 flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium uppercase">{title}</span>
                  <Icon size={18} />
                </div>
                <div className="text-2xl font-semibold">{String(value)}</div>
              </div>
            ))}
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Disaster Overview</h2>
                <AlertTriangle className="text-alert" size={20} />
              </div>
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
            </div>

            <div className="rounded border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Volunteer Response</h2>
                <Users className="text-leaf" size={20} />
              </div>
              <div className="grid gap-2">
                {alerts.slice(0, 6).map((alert) => (
                  <div className="grid grid-cols-[1fr_auto] gap-3 rounded border border-slate-200 p-3" key={alert.alert_id}>
                    <div>
                      <div className="text-sm font-medium">{alert.volunteer_id}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {label(alert.task_category)} · {alert.approximate_distance} mi
                      </div>
                    </div>
                    <span className="rounded bg-field px-2 py-1 text-xs font-medium text-leaf">
                      {label(alert.status)}
                    </span>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="rounded border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                    No alerts yet. Run the flood demo or dispatch a disaster.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="mt-5 rounded border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Disaster Task Board</h2>
              <Truck className="text-flood" size={20} />
            </div>
            <div className="grid gap-3 xl:grid-cols-6">
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
                            <span className="rounded bg-field px-2 py-1 text-leaf">
                              {label(task.operating_mode)}
                            </span>
                            <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">
                              {label(task.priority)}
                            </span>
                            <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">
                              {label(task.risk_classification)}
                            </span>
                          </div>
                        </article>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
