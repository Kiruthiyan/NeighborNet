import { History } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { EmptyState, Table } from "../../components/ui";
import { getAuditLog } from "../../lib/api";
import { formatDate } from "../../lib/format";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const events = await getAuditLog();
  const ordered = [...events].reverse();

  return (
    <AppShell
      description="Every deterministic action the system took — normal matches, disaster dispatch, status changes, recoveries, and decision approvals — in order."
      title="Activity / Audit Trail"
    >
      <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
        <History size={14} />
        <span>{events.length} events recorded.</span>
      </div>

      {events.length === 0 ? (
        <EmptyState>No activity recorded yet. Run the demo scenario or use the dashboard actions.</EmptyState>
      ) : (
        <Table columns={["When", "Source", "Event"]}>
          {ordered.map((event) => (
            <tr key={event.event_id}>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                {formatDate(event.timestamp)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 capitalize">{event.source}</td>
              <td className="px-4 py-3">{event.description}</td>
            </tr>
          ))}
        </Table>
      )}
    </AppShell>
  );
}
