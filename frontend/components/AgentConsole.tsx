"use client";

import { Bot, Loader2, Send, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { instructAgent } from "../lib/api";

interface Turn {
  instruction: string;
  response?: string;
  error?: string;
}

const EXAMPLE_PROMPTS = [
  "Summarize the current community and disaster status.",
  "A flood just hit the south zone with high water levels. Create the disaster, alert nearby volunteers, and assign the accepted ones.",
  "A volunteer just cancelled and a road in the south zone is closed. Report the disruption for the affected tasks.",
  "List any decisions waiting for human approval right now."
];

export function AgentConsole() {
  const [instruction, setInstruction] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setInstruction("");
    setTurns((prev) => [...prev, { instruction: value }]);
    try {
      const result = await instructAgent(value);
      setTurns((prev) =>
        prev.map((turn, index) =>
          index === prev.length - 1 ? { ...turn, response: result.response } : turn
        )
      );
    } catch (err) {
      setTurns((prev) =>
        prev.map((turn, index) =>
          index === prev.length - 1
            ? { ...turn, error: err instanceof Error ? err.message : "Agent call failed" }
            : turn
        )
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded border border-slate-200 bg-white p-5">
      <div className="mb-1 flex items-center gap-2">
        <Bot className="text-leaf" size={20} />
        <h2 className="text-lg font-semibold">NeighborNet Orchestrator (Strands Agent)</h2>
      </div>
      <p className="mb-4 text-sm text-slate-600">
        Type a coordinator instruction in plain language. A real Strands Agents SDK agent running
        on Amazon Bedrock decides which deterministic tools to call — creating disasters, alerting
        volunteers, assigning tasks, reporting disruptions. It has no tool for RED-tier actions
        (medical, evacuation, rescue, unsafe travel, restricted zones) and can never approve its
        own AMBER decisions — a human coordinator still must do that on the{" "}
        <span className="font-medium">Decisions</span> page.
      </p>

      {turns.length === 0 && (
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              className="rounded border border-slate-200 bg-slate-50 p-2 text-left text-xs text-slate-600 hover:border-leaf hover:bg-leaf/5"
              key={prompt}
              onClick={() => submit(prompt)}
              type="button"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div className="mb-4 grid max-h-96 gap-3 overflow-y-auto">
        {turns.map((turn, index) => (
          <div className="grid gap-2" key={index}>
            <div className="ml-auto max-w-[85%] rounded bg-flood/10 px-3 py-2 text-sm text-flood">
              {turn.instruction}
            </div>
            {turn.response && (
              <div className="mr-auto max-w-[85%] rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm whitespace-pre-wrap">
                {turn.response}
              </div>
            )}
            {turn.error && (
              <div className="mr-auto flex max-w-[85%] items-start gap-2 rounded border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                <ShieldAlert className="mt-0.5 shrink-0" size={16} />
                <span>{turn.error}</span>
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="mr-auto flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            <Loader2 className="animate-spin" size={16} />
            Agent is reasoning…
          </div>
        )}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit(instruction);
        }}
      >
        <input
          className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm"
          disabled={busy}
          onChange={(event) => setInstruction(event.target.value)}
          placeholder="e.g. A flood hit the south zone, respond and get volunteers moving."
          value={instruction}
        />
        <button
          className="grid place-items-center rounded bg-leaf px-4 py-2 text-white hover:bg-leaf/90 disabled:opacity-50"
          disabled={busy || !instruction.trim()}
          type="submit"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
