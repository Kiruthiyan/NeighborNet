"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Check, X, AlertTriangle, Lock, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { Panel, Badge, EmptyState } from "../../../components/ui";
import { apiGet, request } from "../../../lib/api";

export default function OpsDecisionsPage() {
  const [amberDecisions, setAmberDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadDecisions = async () => {
    setLoading(true);
    try {
      const data = await apiGet<any[]>("/decisions/pending", []);
      setAmberDecisions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load pending decisions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDecisions();
  }, []);

  const handleApprove = async (decisionId: string) => {
    setProcessing(decisionId);
    try {
      await request(`/decisions/${decisionId}/approve`, { method: "POST" });
      await loadDecisions();
    } catch (err) {
      console.error("Failed to approve decision", err);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (decisionId: string) => {
    setProcessing(decisionId);
    try {
      await request(`/decisions/${decisionId}/reject`, { method: "POST" });
      await loadDecisions();
    } catch (err) {
      console.error("Failed to reject decision", err);
    } finally {
      setProcessing(null);
    }
  };

  const greenDecisions = [
    {
      id: "DEC-G01",
      action: "Auto-Match REQ-002 with Donation RES-008",
      reason: "Exact category match (Water), zero route detour, low risk assessment score (0.05).",
      timestamp: "12 mins ago",
    },
    {
      id: "DEC-G02",
      action: "Auto-Dispatch Volunteer Alex M. for Task TSK-088",
      reason: "Volunteer verified with active vehicle in Zone 1. Estimated delivery window < 30 mins.",
      timestamp: "45 mins ago",
    },
  ];

  const redDecisions = [
    {
      id: "DEC-R01",
      action: "BLOCKED: Dispatch Unverified Driver into Active Disaster Zone 3",
      explanation: "Safety policy violation: Volunteer profile lacks emergency zone hazard certification.",
      timestamp: "2 hours ago",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in text-slate-100 font-sans">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
            Safety & Decision Center
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <ShieldCheck className="text-amber-400" size={24} />
          Deterministic Risk Tier Classifier
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
          Actions are evaluated against deterministic safety boundaries: Green actions are auto-executed; Amber actions require explicit coordinator approval; Red actions are strictly blocked.
        </p>
      </div>

      {/* AMBER SECTION - Pending Human Approvals */}
      <div className="rounded-2xl border border-amber-500/40 bg-slate-900 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-amber-500 animate-ping" />
            <h2 className="text-base font-bold text-amber-400 uppercase tracking-wide">
              AMBER TIER – Pending Coordinator Approval ({amberDecisions.length})
            </h2>
          </div>
          <span className="text-xs text-amber-300/80 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 font-semibold">
            Human-in-the-Loop Required
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading pending decisions...</div>
        ) : amberDecisions.length === 0 ? (
          <EmptyState icon={ShieldCheck}>
            <p className="font-semibold text-slate-300">All clear! No pending Amber approvals.</p>
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {amberDecisions.map((dec) => (
              <div
                key={dec.decision_id || dec.id}
                className="rounded-xl border border-amber-500/30 bg-slate-950 p-5 flex flex-col justify-between shadow-md hover:border-amber-500/50 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold text-amber-400">
                      {dec.decision_id || dec.id || "DEC-A01"}
                    </span>
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded">
                      MEDIUM RISK
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white leading-snug">{dec.action || dec.proposed_action || "Proposed Reassignment"}</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    <strong className="text-amber-300">Reason / Evidence:</strong> {dec.reason || dec.evidence || "Route rerouting recommended due to severe traffic."}
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => handleApprove(dec.decision_id || dec.id)}
                    disabled={processing === (dec.decision_id || dec.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50"
                  >
                    <Check size={14} /> Approve & Execute
                  </button>
                  <button
                    onClick={() => handleReject(dec.decision_id || dec.id)}
                    disabled={processing === (dec.decision_id || dec.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 px-3 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 transition-all disabled:opacity-50"
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GREEN & RED SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GREEN TIER */}
        <div className="rounded-2xl border border-emerald-500/30 bg-slate-900 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wide">
              GREEN TIER – Auto-Executed Actions
            </h2>
          </div>
          <div className="space-y-3">
            {greenDecisions.map((g) => (
              <div key={g.id} className="p-4 rounded-xl bg-slate-950 border border-emerald-500/20 text-xs">
                <div className="flex items-center justify-between text-emerald-400 font-bold mb-1">
                  <span>{g.action}</span>
                  <span className="text-[10px] text-slate-500 font-normal">{g.timestamp}</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">{g.reason}</p>
              </div>
            ))}
          </div>
        </div>

        {/* RED TIER */}
        <div className="rounded-2xl border border-rose-500/30 bg-slate-900 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <h2 className="text-sm font-bold text-rose-400 uppercase tracking-wide">
              RED TIER – Blocked Actions (No Execution)
            </h2>
          </div>
          <div className="space-y-3">
            {redDecisions.map((r) => (
              <div key={r.id} className="p-4 rounded-xl bg-slate-950 border border-rose-500/20 text-xs">
                <div className="flex items-center justify-between text-rose-400 font-bold mb-1">
                  <span className="flex items-center gap-1">
                    <Lock size={14} /> {r.action}
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">{r.timestamp}</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">{r.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
