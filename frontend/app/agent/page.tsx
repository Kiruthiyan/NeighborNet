import { AppShell } from "../../components/AppShell";
import { AgentConsole } from "../../components/AgentConsole";

export const dynamic = "force-dynamic";

export default function AgentPage() {
  return (
    <AppShell
      description="Talk to the real LLM-driven coordinator built with the Strands Agents SDK on Amazon Bedrock. Every action it takes runs through the same deterministic engines and risk gating as the rest of the app."
      requireCoordinator
      title="Agent Console"
    >
      <AgentConsole />
    </AppShell>
  );
}
