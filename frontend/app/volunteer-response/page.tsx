import { Radio } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { AlertActions } from "../../components/actions";
import { Badge, EmptyState, Table } from "../../components/ui";
import { getAlerts } from "../../lib/api";
import { formatDate, label } from "../../lib/format";

export const dynamic = "force-dynamic";

const statusTone: Record<string, "green" | "amber" | "red" | "neutral"> = {
  pending: "amber",
  accepted: "green",
  declined: "neutral",
  timed_out: "red",
  cancelled: "neutral"
};

export default async function VolunteerResponsePage() {
  const alerts = await getAlerts();

  return (
    <AppShell
      description="Alerts sent to nearby verified volunteers. Accepting an alert only makes a volunteer eligible — it never assigns a task directly; assignment still runs through the deterministic planner."
      title="Volunteer Response Panel"
    >
      <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
        <Radio size={14} />
        <span>{alerts.length} alerts sent.</span>
      </div>

      {alerts.length === 0 ? (
        <EmptyState>No alerts yet. Dispatch a disaster from the Disaster Overview page.</EmptyState>
      ) : (
        <Table columns={["Volunteer", "Category", "Distance", "Urgency", "Status", "Sent", "Action"]}>
          {alerts.map((alert) => (
            <tr key={alert.alert_id}>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                {alert.volunteer_id}
              </td>
              <td className="px-4 py-3">{label(alert.task_category)}</td>
              <td className="whitespace-nowrap px-4 py-3">{alert.approximate_distance} mi</td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge tone={alert.urgency === "high" ? "amber" : "neutral"}>{label(alert.urgency)}</Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge tone={statusTone[alert.status] ?? "neutral"}>{label(alert.status)}</Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                {formatDate(alert.sent_at as string)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <AlertActions alertId={alert.alert_id} status={alert.status} />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </AppShell>
  );
}
