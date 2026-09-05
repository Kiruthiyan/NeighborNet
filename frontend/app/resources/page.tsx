import { Package } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Badge, EmptyState, Table } from "../../components/ui";
import { getInventory } from "../../lib/api";
import { formatDate, label } from "../../lib/format";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const inventory = await getInventory();

  return (
    <AppShell
      description="Surplus food and supply batches available for matching against community requests."
      title="Resources / Inventory"
    >
      {inventory.length === 0 ? (
        <EmptyState>
          No inventory batches yet. Seed data from the demo runner or a donor intake will appear here.
        </EmptyState>
      ) : (
        <Table columns={["Batch", "Resource", "Description", "Available", "Allocated", "Reserved", "Expiry", "Donor"]}>
          {inventory.map((batch) => (
            <tr key={batch.batch_id}>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                {batch.batch_id}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge>{label(batch.resource_type)}</Badge>
              </td>
              <td className="px-4 py-3">{batch.description}</td>
              <td className="whitespace-nowrap px-4 py-3">
                {batch.quantity_available} {batch.unit}
              </td>
              <td className="whitespace-nowrap px-4 py-3">{batch.quantity_allocated}</td>
              <td className="whitespace-nowrap px-4 py-3">{batch.quantity_reserved}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                {formatDate(batch.expiry_datetime as string)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                {batch.donor_org_id}
              </td>
            </tr>
          ))}
        </Table>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Package size={14} />
        <span>{inventory.length} batches tracked from the shared coordination state.</span>
      </div>
    </AppShell>
  );
}
