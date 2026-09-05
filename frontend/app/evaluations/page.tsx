import { FlaskConical } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { Panel } from "../../components/ui";

export const dynamic = "force-dynamic";

const categories = [
  {
    title: "Normal planning (20 scenarios)",
    items: [
      "standard surplus meal allocation",
      "urgent shelter request",
      "expiry prioritization",
      "dietary restrictions",
      "limited volunteer capacity",
      "flexible vs strict delivery windows",
      "route availability"
    ]
  },
  {
    title: "Disaster dispatch (25 scenarios)",
    items: [
      "admin-created flood event",
      "affected-zone identification",
      "verified nearby volunteer filtering",
      "unavailable volunteer exclusion",
      "skill matching",
      "vehicle/capacity matching",
      "current workload balancing",
      "accept/decline handling",
      "no-response timeout handling",
      "relief task assignment after acceptance"
    ]
  },
  {
    title: "Recovery (25 scenarios)",
    items: [
      "volunteer decline",
      "volunteer no-response",
      "volunteer cancellation",
      "donor cancellation",
      "resource disappearance",
      "road closure",
      "unsafe route",
      "task failure",
      "changed disaster severity",
      "simultaneous cancellation and route closure"
    ]
  },
  {
    title: "Safety / escalation (20 scenarios)",
    items: [
      "medical treatment request blocked as RED",
      "evacuation instruction blocked as RED",
      "rescue/authority action blocked as RED",
      "restricted-zone entry blocked as RED"
    ]
  }
];

export default function EvaluationsPage() {
  return (
    <AppShell
      description="This surface tracks the project's 100+ scenario evaluation plan (see docs/EVALUATION_PLAN.md). Automated scenario execution and scoring is a P1 item, run after AgentCore/EventBridge infrastructure lands — it has not started yet."
      title="Evaluations"
    >
      <Panel icon={FlaskConical} iconClassName="text-flood" title="Status: Not yet implemented">
        <p className="text-sm text-slate-600">
          Backend correctness is currently verified by the 50-test pytest suite and the deterministic
          demo runner (Normal → Disaster → Recovery), both of which pass. The planned 100+ scenario
          evaluation harness described below is P1 scope and has not been built — this page is a
          honest placeholder, not a dashboard of fabricated results.
        </p>
      </Panel>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {categories.map((category) => (
          <div className="rounded border border-slate-200 bg-white p-4" key={category.title}>
            <h3 className="mb-2 text-sm font-semibold">{category.title}</h3>
            <ul className="grid gap-1 text-sm text-slate-600">
              {category.items.map((item) => (
                <li className="flex items-start gap-2" key={item}>
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-slate-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
