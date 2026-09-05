import { Ban, CheckCircle2, ShieldAlert } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Panel } from "../../components/ui";

export const dynamic = "force-dynamic";

const redKeywords = [
  "evacuation",
  "evacuate",
  "rescue",
  "medical",
  "treatment",
  "restricted",
  "unsafe",
  "authority"
];

export default function SettingsPage() {
  return (
    <AppShell
      description="Read-only view of the deterministic safety policy enforced by src/engines/risk_classifier.py. There is no editable policy UI yet — this is a faithful mirror of the actual backend rules, not a mock settings screen."
      title="Settings / Policies"
    >
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel icon={CheckCircle2} iconClassName="text-leaf" title="GREEN — Autonomous">
          <p className="text-sm text-slate-600">
            Any validated logistics action that doesn't match an AMBER or RED rule below executes
            automatically. This is the default classification.
          </p>
        </Panel>

        <Panel icon={ShieldAlert} iconClassName="text-alert" title="AMBER — Requires Approval">
          <ul className="grid gap-2 text-sm text-slate-600">
            <li>Route marked unsafe is escalated to RED instead, not AMBER.</li>
            <li>Disaster-mode major redistribution or an uncertain route.</li>
            <li>A critical-priority disaster task competing under a resource shortage.</li>
            <li>Validation failed or was incomplete.</li>
          </ul>
        </Panel>

        <Panel icon={Ban} iconClassName="text-danger" title="RED — Always Blocked">
          <p className="mb-2 text-sm text-slate-600">
            Blocked outright and never runs autonomously, regardless of mode. Matches if the
            action's title, description, category, or route status contains any of:
          </p>
          <div className="flex flex-wrap gap-2">
            {redKeywords.map((keyword) => (
              <span className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-danger" key={keyword}>
                {keyword}
              </span>
            ))}
          </div>
          <p className="mt-2 text-sm text-slate-600">
            A route explicitly marked unsafe (<code>route_safe: false</code>) is also always RED.
          </p>
        </Panel>
      </div>
    </AppShell>
  );
}
