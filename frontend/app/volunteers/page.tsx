import { ShieldCheck, Users } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Badge, EmptyState, Table } from "../../components/ui";
import { getVolunteers } from "../../lib/api";
import { label } from "../../lib/format";

export const dynamic = "force-dynamic";

export default async function VolunteersPage() {
  const volunteers = await getVolunteers();

  return (
    <AppShell
      description="Verified volunteers with skills, service zones, and workload used by the deterministic matcher."
      title="Volunteers"
    >
      {volunteers.length === 0 ? (
        <EmptyState>No volunteers registered yet.</EmptyState>
      ) : (
        <Table columns={["Volunteer", "Zone", "Skills", "Vehicle", "Deliveries", "Reliability", "Verified"]}>
          {volunteers.map((volunteer) => (
            <tr key={volunteer.volunteer_id}>
              <td className="whitespace-nowrap px-4 py-3">
                <div className="text-sm font-medium">{volunteer.name}</div>
                <div className="font-mono text-xs text-slate-400">{volunteer.volunteer_id}</div>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {label(volunteer.last_known_zone ?? volunteer.preferred_zones?.[0])}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {(volunteer.skills ?? []).map((skill) => (
                    <Badge key={skill}>{label(skill)}</Badge>
                  ))}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3">{volunteer.has_vehicle ? "Yes" : "No"}</td>
              <td className="whitespace-nowrap px-4 py-3">{volunteer.total_deliveries}</td>
              <td className="whitespace-nowrap px-4 py-3">
                {Math.round((volunteer.reliability_score ?? 0) * 100)}%
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {volunteer.verified ? (
                  <Badge tone="green">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck size={12} /> Verified
                    </span>
                  </Badge>
                ) : (
                  <Badge tone="amber">Unverified</Badge>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Users size={14} />
        <span>{volunteers.length} volunteers tracked from the shared coordination state.</span>
      </div>
    </AppShell>
  );
}
