import { AlertTriangle } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { AssignDisasterTasksButton, CreateFloodDemoButton, DispatchDisasterButton } from "../../components/actions";
import { Badge, EmptyState } from "../../components/ui";
import { getDisasters } from "../../lib/api";
import { label } from "../../lib/format";

export const dynamic = "force-dynamic";

export default async function DisasterOverviewPage() {
  const disasters = await getDisasters();

  return (
    <AppShell
      description="Admin-created disaster events, their affected zones, and the relief needs generated for each."
      title="Disaster Overview"
    >
      <div className="mb-4 flex justify-end">
        <CreateFloodDemoButton />
      </div>

      {disasters.length === 0 ? (
        <EmptyState>No active disasters. Create one to start the disaster-response workflow.</EmptyState>
      ) : (
        <div className="grid gap-4">
          {disasters.map((disaster) => (
            <div className="rounded border border-slate-200 bg-white p-5" key={disaster.disaster_id}>
              <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="text-alert" size={18} />
                    <h2 className="text-lg font-semibold">{disaster.title}</h2>
                    <Badge tone={disaster.severity === "critical" ? "red" : "amber"}>
                      {label(disaster.severity)}
                    </Badge>
                    <Badge>{label(disaster.status)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{disaster.description}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Zones: {disaster.affected_zones.map(label).join(", ") || "—"}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <DispatchDisasterButton disasterId={disaster.disaster_id} />
                  <AssignDisasterTasksButton disasterId={disaster.disaster_id} />
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {disaster.needs.map((need) => (
                  <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm" key={need.need_id}>
                    <div className="font-medium">{label(need.category)}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Qty {need.quantity} · {label(need.priority)} · {label(need.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
