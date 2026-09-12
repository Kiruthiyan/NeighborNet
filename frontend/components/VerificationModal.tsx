"use client";

import { useState } from "react";
import { X, QrCode, KeyRound, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { request } from "../lib/api";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  verificationType: "pickup" | "delivery";
  onSuccess?: () => void;
  expectedOtp?: string;
  expectedQrPayload?: string;
}

export function VerificationModal({
  isOpen,
  onClose,
  taskId,
  verificationType,
  onSuccess,
  expectedOtp,
  expectedQrPayload,
}: VerificationModalProps) {
  const [mode, setMode] = useState<"otp" | "qr">("otp");
  const [inputCode, setInputCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  if (!isOpen) return null;

  const isPickup = verificationType === "pickup";
  const title = isPickup ? "Verify Donation Pickup" : "Verify Donation Delivery";
  const endpoint = isPickup ? `/tasks/${taskId}/verify-pickup` : `/tasks/${taskId}/verify-delivery`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await request(endpoint, {
        method: "POST",
        body: JSON.stringify({ code: inputCode.trim() }),
      });

      setVerifiedSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setVerifiedSuccess(false);
        setInputCode("");
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || `Failed to verify ${verificationType}. Check code and try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateScan = () => {
    if (expectedQrPayload) {
      setInputCode(expectedQrPayload);
    } else if (expectedOtp) {
      setInputCode(expectedOtp);
    } else {
      setInputCode(`{"task_id":"${taskId}","type":"${verificationType}","code":"789201"}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between border-b ${
          isPickup ? "bg-emerald-50/80 border-emerald-100" : "bg-sky-50/80 border-sky-100"
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isPickup ? "bg-emerald-600 text-white" : "bg-sky-600 text-white"}`}>
              {mode === "otp" ? <KeyRound size={18} /> : <QrCode size={18} />}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">{title}</h3>
              <p className="text-xs text-slate-500 font-medium">Task ID: <span className="font-mono font-bold text-slate-700">{taskId}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">

          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setMode("otp"); setError(null); }}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === "otp" ? "bg-white text-slate-900 shadow-2xs font-extrabold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <KeyRound size={14} /> Enter OTP Code
            </button>
            <button
              type="button"
              onClick={() => { setMode("qr"); setError(null); }}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === "qr" ? "bg-white text-slate-900 shadow-2xs font-extrabold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <QrCode size={14} /> Scan / Paste QR Code
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {verifiedSuccess && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800">
              <ShieldCheck size={18} className="shrink-0 text-emerald-600" />
              <span>Verification successful! Single-use code consumed.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "otp" ? (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Enter 6-digit {isPickup ? "Donor" : "Recipient"} OTP Code:
                </label>
                <div className="relative">
                  <KeyRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="e.g. 849201"
                    maxLength={10}
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 font-mono text-lg font-bold text-slate-900 tracking-wider focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    autoFocus
                  />
                </div>
                {expectedOtp && (
                  <p className="text-[11px] text-slate-400">
                    Sample active OTP for test: <button type="button" onClick={() => setInputCode(expectedOtp)} className="font-mono font-bold text-emerald-700 hover:underline">{expectedOtp}</button>
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Scan or paste QR code string payload:
                </label>
                <textarea
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder='{"task_id":"...","type":"...","code":"..."}'
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleSimulateScan}
                  className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <QrCode size={14} /> Simulate Camera QR Scan
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!inputCode.trim() || loading || verifiedSuccess}
                className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold text-white transition-all flex items-center justify-center gap-2 ${
                  isPickup
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
                    : "bg-sky-600 hover:bg-sky-700 shadow-md shadow-sky-600/20"
                } disabled:bg-slate-300 disabled:cursor-not-allowed`}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : verifiedSuccess ? (
                  <CheckCircle2 size={16} />
                ) : (
                  `Confirm ${isPickup ? "Pickup" : "Delivery"}`
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
