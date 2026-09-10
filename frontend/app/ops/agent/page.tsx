"use client";

import { useState } from "react";
import { Bot, Send, Sparkles, ShieldCheck, ArrowRight, CornerDownLeft, AlertCircle } from "lucide-react";
import { Panel } from "../../../components/ui";
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
    <div className="space-y-6 animate-fade-in text-slate-100 font-sans max-w-5xl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
            Autonomous AI Operations Console
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Bot className="text-sky-400" size={24} />
          NeighborNet Operations Assistant
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Natural language command center with real-time risk classification and safety boundaries.
        </p>
      </div>

      {/* Safety & Transparency Pipeline Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-300">
        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
          Execution Safety Pipeline:
        </span>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <span className="bg-slate-800 text-sky-400 px-2 py-0.5 rounded border border-slate-700">
            1. Intent Parsing
          </span>
          <ArrowRight size={12} className="text-slate-600" />
          <span className="bg-slate-800 text-sky-400 px-2 py-0.5 rounded border border-slate-700">
            2. Deterministic Engine
          </span>
          <ArrowRight size={12} className="text-slate-600" />
          <span className="bg-amber-950 text-amber-400 px-2 py-0.5 rounded border border-amber-800">
            3. Safety Classifier
          </span>
          <ArrowRight size={12} className="text-slate-600" />
          <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800">
            4. Execution / Approval
          </span>
        </div>
      </div>

      {/* Conversation Window */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 flex flex-col h-[520px] shadow-2xl overflow-hidden">
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
                    ? "bg-emerald-600 text-white"
                    : "bg-sky-600/20 text-sky-400 border border-sky-500/30"
                }`}
              >
                {m.role === "user" ? "YOU" : <Bot size={16} />}
              </div>

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-emerald-600 text-white font-medium"
                    : "bg-slate-950 border border-slate-800 text-slate-200"
                }`}
              >
                {m.risk && (
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        m.risk === "GREEN"
                          ? "bg-emerald-400"
                          : m.risk === "AMBER"
                          ? "bg-amber-400 animate-ping"
                          : "bg-rose-400"
                      }`}
                    />
                    <span
                      className={
                        m.risk === "GREEN"
                          ? "text-emerald-400"
                          : m.risk === "AMBER"
                          ? "text-amber-400"
                          : "text-rose-400"
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
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-600/20 text-sky-400 border border-sky-500/30">
                <Bot size={16} className="animate-spin" />
              </div>
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 text-xs text-slate-400 flex items-center gap-2">
                <Sparkles size={14} className="text-sky-400 animate-pulse" />
                Evaluating deterministic constraint policies & safety rules...
              </div>
            </div>
          )}
        </div>

        {/* Suggestion Chips */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-t border-slate-800 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-bold uppercase text-slate-500 shrink-0">Prompts:</span>
          {suggestionChips.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSend(chip)}
              className="shrink-0 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-300 transition-all"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-3"
        >
          <input
            type="text"
            placeholder="Type an operations instruction (e.g. 'Match pending food requests with surplus at Zone 1 hub')..."
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !instruction.trim()}
            className="rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            <span>Send</span>
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
