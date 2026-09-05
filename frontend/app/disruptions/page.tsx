import { AlertTriangle } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { DisruptionForm } from "../../components/DisruptionForm";
import { EmptyState, Panel, Table } from "../../components/ui";
import { getDisruptions, getTasks } from "../../lib/api";
import { formatDate } from "../../lib/format";

export const dynamic = "force-dynamic";

export default async function DisruptionsPage() {
  const [tasks, events] = await Promise.all([getTasks(), getDisruptions()]);
  const recoveryEvents = events.filter((event) =>
    event.description?.toLowerCase().includes("recover")
  );

  return (
    <AppShell
      description="Cancellations, route closures, and resource loss run through the deterministic recovery engine before anything resumes."
      title="Disruptions & Recovery"
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <DisruptionForm tasks={tasks} />

        <Panel icon={AlertTriangle} iconClassName="text-alert" title="Recovery Activity">
          {recoveryEvents.length === 0 ? (
            <EmptyState>No recovery events yet.</EmptyState>
          ) : (
            <div className="grid gap-2">
              {recoveryEvents.slice(0, 10).map((event) => (
                <div className="rounded border border-slate-200 p-3 text-sm" key={event.event_id}>
                  <div>{event.description}</div>
                  <div className="mt-1 text-xs text-slate-400">{formatDate(event.timestamp)}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="mt-5">
        <Table columns={["Event", "Source", "When"]}>
          {events.map((event) => (
            <tr key={event.event_id}>
              <td className="px-4 py-3">{event.description}</td>
              <td className="whitespace-nowrap px-4 py-3">{event.source}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                {formatDate(event.timestamp)}
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </AppShell>
  );
}
