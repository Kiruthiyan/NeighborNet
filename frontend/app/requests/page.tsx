import { ClipboardList } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Badge, EmptyState, Table } from "../../components/ui";
import { getRequests } from "../../lib/api";
import { formatDate, label } from "../../lib/format";

export const dynamic = "force-dynamic";

const urgencyTone: Record<string, "green" | "amber" | "red" | "neutral"> = {
  low: "neutral",
  medium: "green",
  high: "amber",
  critical: "red"
};

export default async function RequestsPage() {
  const requests = await getRequests();

  return (
    <AppShell
      description="Community resource requests waiting for a compatible surplus match and volunteer delivery."
      title="Requests"
    >
      {requests.length === 0 ? (
        <EmptyState>
          No open requests. New shelter/organization requests will appear here as they come in.
        </EmptyState>
      ) : (
        <Table columns={["Request", "Requesting Org", "Resource", "Requested", "Fulfilled", "Urgency", "Required By", "Status"]}>
          {requests.map((request) => (
            <tr key={request.request_id}>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                {request.request_id}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                {request.requesting_org_id}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge>{label(request.resource_type)}</Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3">{request.quantity_requested}</td>
              <td className="whitespace-nowrap px-4 py-3">{request.quantity_fulfilled}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge tone={urgencyTone[request.urgency_level] ?? "neutral"}>
                  {label(request.urgency_level)}
                </Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                {formatDate(request.required_by)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge>{label(request.status)}</Badge>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <ClipboardList size={14} />
        <span>{requests.length} requests tracked from the shared coordination state.</span>
      </div>
    </AppShell>
  );
}
