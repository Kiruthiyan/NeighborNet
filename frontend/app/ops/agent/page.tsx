"use client";

import { useState } from "react";
import { Bot, Send, Sparkles, ShieldCheck, ArrowRight, CornerDownLeft, AlertCircle } from "lucide-react";
import { Panel, Button, Input } from "../../../components/ui";
import { instructAgent } from "../../../lib/api";

export default function OpsAgentPage() {
  const [instruction, setInstruction] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "agent"; text: string; risk?: string; details?: any }[]
  >([
    {
      role: "agent",
      text: "Hello Coordinator! I am the NeighborNet Operations Assistant. I can help analyze community readiness, optimize volunteer routes, evaluate disaster alerts, and draft response actions.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const suggestionChips = [
    "Assess flood impact in Zone 2",
    "Find available food surplus for Shelter A",
    "Check unassigned volunteer drivers",
    "Draft emergency disaster declaration",
  ];

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || instruction;
    if (!query.trim()) return;

    const userMsg = { role: "user" as const, text: query };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInstruction("");
    setLoading(true);

    try {
      const res = await instructAgent(query);
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: res.response || "Instruction processed successfully.",
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          text: `Error processing request: ${err?.message || "Internal agent engine timeout"}`,
          risk: "RED",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100 font-sans max-w-5xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            Autonomous AI Operations Console
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-sky-500 dark:bg-sky-400 animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Bot className="text-sky-600 dark:text-sky-400" size={24} />
          NeighborNet Operations Assistant
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Natural language command center with real-time risk classification and safety boundaries.
        </p>
      </div>

      {/* Safety & Transparency Pipeline Banner */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
        <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
          Execution Safety Pipeline:
        </span>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <span className="bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
            1. Intent Parsing
          </span>
          <ArrowRight size={12} className="text-slate-400 dark:text-slate-600" />
          <span className="bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
            2. Deterministic Engine
          </span>
          <ArrowRight size={12} className="text-slate-400 dark:text-slate-600" />
          <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800">
            3. Safety Classifier
          </span>
          <ArrowRight size={12} className="text-slate-400 dark:text-slate-600" />
          <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
            4. Execution / Approval
          </span>
        </div>
      </div>

      {/* Conversation Window */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-[520px] shadow-2xl overflow-hidden">
        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${
                m.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                  m.role === "user"
                    ? "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white"
                    : "bg-sky-100 text-sky-600 border border-sky-300 dark:bg-sky-600/20 dark:text-sky-400 dark:border-sky-500/30"
                }`}
              >
                {m.role === "user" ? "YOU" : <Bot size={16} />}
              </div>

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-slate-100 text-slate-900 font-medium dark:bg-slate-700 dark:text-white"
                    : "bg-white border border-slate-200 text-slate-900 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                }`}
              >
                {m.risk && (
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded bg-slate-100 dark:bg-slate-900 px-2 py-0.5 text-[10px] font-bold">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        m.risk === "GREEN"
                          ? "bg-emerald-500 dark:bg-emerald-400"
                          : m.risk === "AMBER"
                          ? "bg-amber-500 dark:bg-amber-400 animate-ping"
                          : "bg-rose-500 dark:bg-rose-400"
                      }`}
                    />
                    <span
                      className={
                        m.risk === "GREEN"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : m.risk === "AMBER"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400"
                      }
                    >
                      {m.risk} RISK CLASSIFICATION
                    </span>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-600 border border-sky-300 dark:bg-sky-600/20 dark:text-sky-400 dark:border-sky-500/30">
                <Bot size={16} className="animate-spin" />
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 text-slate-600 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 p-4 text-xs flex items-center gap-2">
                <Sparkles size={14} className="text-sky-600 dark:text-sky-400 animate-pulse" />
                Evaluating deterministic constraint policies & safety rules...
              </div>
            </div>
          )}
        </div>

        {/* Suggestion Chips */}
        <div className="px-4 py-2.5 bg-slate-100/60 border-t border-slate-200 dark:bg-slate-950/60 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-500 shrink-0">Prompts:</span>
          {suggestionChips.map((chip) => (
            <Button
              key={chip}
              onClick={() => handleSend(chip)}
              variant="secondary"
              size="sm"
              className="shrink-0 !rounded-lg !py-1 !text-[11px] whitespace-nowrap"
            >
              {chip}
            </Button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 bg-white border-t border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex items-center gap-3"
        >
          <Input
            type="text"
            placeholder="Type an operations instruction (e.g. 'Match pending food requests with surplus at Zone 1 hub')..."
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="primary" disabled={loading || !instruction.trim()}>
            <span>Send</span>
            <Send size={14} />
          </Button>
        </form>
      </div>
    </div>
  );
}
