"use client";

import { useState } from "react";
import { ShieldAlert, AlertCircle, CheckCircle2, Loader2, Plus, X } from "lucide-react";
import { Panel, Badge } from "../../../components/ui";
import { reportDisaster, type DisasterEvent } from "../../../lib/api";

const DISASTER_TYPES = ["flood", "fire", "storm", "earthquake", "landslide", "other"];
const REGIONS = ["north", "central", "south"];
const SEVERITIES = ["low", "medium", "high", "critical"];

export default function ReportDisasterPage() {
  const [type, setType] = useState("flood");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState("");
  const [zone, setZone] = useState("");
  const [severity, setSeverity] = useState("high");
  const [evidenceInput, setEvidenceInput] = useState("");
  const [evidence, setEvidence] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DisasterEvent | null>(null);

  const addEvidence = () => {
    const trimmed = evidenceInput.trim();
    if (!trimmed) return;
    setEvidence((prev) => [...prev, trimmed]);
    setEvidenceInput("");
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setRegion("");
    setZone("");
    setSeverity("high");
    setEvidence([]);
    setEvidenceInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!region && !zone.trim()) {
      setError("Please pick a region or enter an affected zone/location.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await reportDisaster({
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        affected_zones: zone.trim() ? [zone.trim()] : undefined,
        region: region || undefined,
        severity,
        evidence
      });
      setResult(created);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldAlert className="text-rose-600" size={24} />
          Report a Disaster
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Seen something serious — a flood, fire, or other emergency? File a report. It goes to a
          coordinator for review before anything is activated; it never mobilizes volunteers on its own.
        </p>
      </div>

      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
          <CheckCircle2 className="text-emerald-600 mt-0.5 shrink-0" size={18} />
          <div className="text-sm text-emerald-800">
            <p className="font-semibold">Report submitted — status: {String(result.status).replace("_", " ")}</p>
            <p className="text-xs text-emerald-700 mt-1">
              A coordinator will review it before it becomes active.
              {Boolean(result.is_duplicate) && " This looks similar to an existing report and was flagged for review as a possible duplicate."}
            </p>
          </div>
        </div>
      )}

      <Panel title="Disaster Report" subtitle="Only the essentials — a coordinator will follow up if more detail is needed" icon={ShieldAlert}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {DISASTER_TYPES.map((t) => (
                  <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Rising floodwater on Elm Street"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What's happening, who/what is affected..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select a region…</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Affected zone / location (optional)</label>
              <input
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="e.g. Elm Street riverside"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Evidence (optional links or notes)</label>
            <div className="flex gap-2">
              <input
                value={evidenceInput}
                onChange={(e) => setEvidenceInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEvidence(); } }}
                placeholder="Photo link, witness note, etc."
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={addEvidence}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                <Plus size={14} /> Add
              </button>
            </div>
            {evidence.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {evidence.map((item, idx) => (
                  <Badge key={idx} tone="neutral">
                    <span className="truncate max-w-[200px]">{item}</span>
                    <button
                      type="button"
                      onClick={() => setEvidence((prev) => prev.filter((_, i) => i !== idx))}
                      className="ml-1"
                    >
                      <X size={11} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-sm px-4 py-2.5 transition-colors"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />}
            Submit Report
          </button>
        </form>
      </Panel>
    </div>
  );
}
