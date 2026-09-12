"use client";

import { useState } from "react";
import { QrCode, Copy, Check, ShieldCheck, Clock, AlertTriangle, RefreshCw } from "lucide-react";

interface QRCodeDisplayProps {
  taskTitle?: string;
  codeType: "pickup" | "delivery";
  otpCode: string;
  qrPayload?: string;
  status?: "pending" | "verified" | "expired" | "invalidated";
  expiresAt?: string;
  verifiedAt?: string;
  onRefresh?: () => void;
}

export function QRCodeDisplay({
  taskTitle = "Donation Task",
  codeType,
  otpCode,
  qrPayload,
  status = "pending",
  expiresAt,
  verifiedAt,
  onRefresh,
}: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(true);

  const payloadString = qrPayload || JSON.stringify({
    type: codeType,
    code: otpCode,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(otpCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPickup = codeType === "pickup";
  const title = isPickup ? "Pickup Verification Code" : "Delivery Verification Code";
  const desc = isPickup
    ? "Show this code/QR to the volunteer when collecting donation"
    : "Provide this code/QR to the volunteer upon receiving delivery";

  // Generate SVG QR Matrix pattern (proportional pattern simulation for zero-dependency rendering)
  const renderSVGQR = (data: string) => {
    // Generate deterministic grid pattern based on hash of input string
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = (hash << 5) - hash + data.charCodeAt(i);
      hash |= 0;
    }

    const size = 17; // 17x17 grid
    const rects: JSX.Element[] = [];

    // Corner finder patterns (7x7 top-left, top-right, bottom-left)
    const isFinder = (r: number, c: number) => {
      if (r < 7 && c < 7) return true;
      if (r < 7 && c >= size - 7) return true;
      if (r >= size - 7 && c < 7) return true;
      return false;
    };

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        let active = false;

        // Finder patterns
        if (
          (r < 7 && c < 7) ||
          (r < 7 && c >= size - 7) ||
          (r >= size - 7 && c < 7)
        ) {
          const lr = r < 7 ? r : r - (size - 7);
          const lc = c < 7 ? c : c >= size - 7 ? c - (size - 7) : c;
          if (lr === 0 || lr === 6 || lc === 0 || lc === 6) active = true;
          else if (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) active = true;
        } else {
          // Data modules based on hash
          const val = (Math.abs(hash ^ (r * 31 + c * 17 + data.charCodeAt((r + c) % data.length))) % 100);
          active = val < 48;
        }

        if (active) {
          rects.push(
            <rect
              key={`${r}-${c}`}
              x={c * 8 + 4}
              y={r * 8 + 4}
              width={7.2}
              height={7.2}
              rx={1.5}
              className={isPickup ? "fill-emerald-800" : "fill-sky-800"}
            />
          );
        }
      }
    }

    return (
      <svg viewBox="0 0 144 144" className="w-36 h-36 mx-auto rounded-xl bg-white p-2 border border-slate-200 shadow-sm">
        {rects}
      </svg>
    );
  };

  const isVerified = status === "verified";
  const isInvalidated = status === "invalidated";

  return (
    <div className={`rounded-2xl border p-4 space-y-3 transition-all ${
      isVerified
        ? "border-emerald-200 bg-emerald-50/50"
        : isInvalidated
        ? "border-slate-300 bg-slate-100 opacity-75"
        : isPickup
        ? "border-emerald-300 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40"
        : "border-sky-300 bg-gradient-to-br from-sky-50/80 via-white to-blue-50/40"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isPickup ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>
            <QrCode size={16} />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-900 leading-tight">{title}</h4>
            <p className="text-[10px] text-slate-500">{desc}</p>
          </div>
        </div>

        {/* Status Badge */}
        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
          isVerified
            ? "bg-emerald-600 text-white border-emerald-600"
            : isInvalidated
            ? "bg-slate-300 text-slate-700 border-slate-400"
            : "bg-amber-100 text-amber-800 border-amber-300"
        }`}>
          {isVerified ? "✓ Verified" : isInvalidated ? "Invalidated" : "Single-Use Code"}
        </span>
      </div>

      {/* Main Code Box */}
      {!isInvalidated && (
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/90 p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
          {/* QR Code */}
          {showQR && (
            <div className="shrink-0 text-center">
              {renderSVGQR(payloadString)}
              <p className="text-[9px] text-slate-400 mt-1 font-semibold">Scan with Volunteer App</p>
            </div>
          )}

          {/* OTP Code Display */}
          <div className="flex-1 space-y-2 text-center sm:text-left min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verification OTP</span>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className={`font-mono font-black text-2xl tracking-widest px-3 py-1 rounded-xl border ${
                isPickup ? "bg-emerald-50 text-emerald-900 border-emerald-300" : "bg-sky-50 text-sky-900 border-sky-300"
              }`}>
                {otpCode}
              </span>
              <button
                onClick={handleCopy}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                title="Copy OTP Code"
              >
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              {isVerified ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <ShieldCheck size={13} /> Verified at {verifiedAt ? new Date(verifiedAt).toLocaleTimeString() : "Just now"}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-500">
                  <Clock size={12} className="text-slate-400" /> Expires after single verification use
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {isInvalidated && (
        <div className="p-3 rounded-xl bg-slate-200/70 border border-slate-300 text-slate-700 text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle size={15} className="text-amber-600" /> Old code invalidated due to volunteer replacement
          </span>
          {onRefresh && (
            <button onClick={onRefresh} className="p-1 rounded bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1">
              <RefreshCw size={12} /> Refresh
            </button>
          )}
        </div>
      )}
    </div>
  );
}
