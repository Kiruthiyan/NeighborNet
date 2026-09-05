import { ShieldAlert } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { DecisionActions } from "../../components/actions";
import { Badge, EmptyState } from "../../components/ui";
import { getDecisions } from "../../lib/api";
import { label } from "../../lib/format";

export const dynamic = "force-dynamic";

export default async function DecisionsPage() {
  const decisions = await getDecisions();

  return (
    <AppShell
      description="AMBER decisions pause the workflow and wait here for a human coordinator. GREEN actions never appear; RED actions are blocked entirely."
      title="Decisions"
    >
      {decisions.length === 0 ? (
        <EmptyState>
          No decisions are waiting for approval. Trigger a recovery with a meaningful conflict from
          the Disruptions page to see one appear here.
        </EmptyState>
      ) : (
        <div className="grid gap-4">
          {decisions.map((decision) => (
            <div className="rounded border border-slate-200 bg-white p-5" key={decision.decision_id}>
              <div className="mb-2 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="text-alert" size={18} />
                    <h2 className="text-lg font-semibold">{decision.title}</h2>
                    <Badge tone="amber">{label(decision.risk_classification)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{decision.description}</p>
                </div>
                <DecisionActions decisionId={decision.decision_id} />
              </div>

              {Array.isArray(decision.options) && decision.options.length > 0 && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {(decision.options as Array<Record<string, unknown>>).map((option) => (
                    <div
                      className="rounded border border-slate-200 bg-slate-50 p-3 text-sm"
                      key={String(option.option_id)}
                    >
                      <div className="font-medium">{String(option.title)}</div>
                      <div className="mt-1 text-xs text-slate-600">{String(option.description)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
