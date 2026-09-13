"use client";

import { useState } from "react";
import { AlertCircle, XCircle, CheckCircle2, Loader2 } from "lucide-react";
import { reportCannotContinue } from "../lib/api";

interface TaskNavigationCardProps {
  taskId: string;
  volunteerId?: string;
  onTaskRecovered?: () => void;
}

/** Real "Cannot Continue" action for a volunteer's own in-progress task.
 * No GPS/ETA/route simulation here - this app has no real coordinate
 * source for tasks/volunteers, so it isn't faked. Failures are shown to
 * the volunteer, never silently treated as success. */
export function TaskNavigationCard({ taskId, volunteerId, onTaskRecovered }: TaskNavigationCardProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("Vehicle breakdown");
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveredSuccess, setRecoveredSuccess] = useState(false);

  const handleCannotContinueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCancelling(true);
    setError(null);

    try {
      await reportCannotContinue(taskId, cancelReason);
      setRecoveredSuccess(true);
      if (onTaskRecovered) onTaskRecovered();
      setTimeout(() => {
        setRecoveredSuccess(false);
        setShowCancelModal(false);
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Failed to submit cancellation. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowCancelModal(true)}
        disabled={!volunteerId}
        className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 disabled:opacity-50 text-rose-700 font-extrabold text-[11px] transition-colors flex items-center gap-1"
      >
        <XCircle size={12} /> Cannot Continue
      </button>

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-700">
              <div className="p-2 rounded-xl bg-rose-100"><AlertCircle size={20} /></div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Declare "Cannot Continue"</h3>
                <p className="text-xs text-slate-500">The coordinator's RecoveryEngine will reassign this task to another volunteer.</p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                {error}
              </div>
            )}

            {recoveredSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Task released for recovery.</span>
              </div>
            )}

            <form onSubmit={handleCannotContinueSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Reason for cancellation:</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:border-rose-500 focus:outline-none"
                >
                  <option>Vehicle breakdown</option>
                  <option>Access road flooded or blocked</option>
                  <option>Personal or medical emergency</option>
                  <option>Cannot locate pickup/destination</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Back to Task
                </button>
                <button
                  type="submit"
                  disabled={cancelling || recoveredSuccess}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 flex items-center justify-center gap-2"
                >
                  {cancelling ? <Loader2 size={16} className="animate-spin" /> : "Submit Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
