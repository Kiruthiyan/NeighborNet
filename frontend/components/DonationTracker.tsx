"use client";

import { CheckCircle2, Circle, Clock, ShieldCheck, MapPin, Package, Truck, Gift, Lock } from "lucide-react";

export interface DonationTrackerProps {
  donationId: string;
  itemName: string;
  quantity: number;
  unit: string;
  status: string;
  pickupVerified?: boolean;
  deliveryVerified?: boolean;
  assignedVolunteerName?: string;
  pickupLocation?: string;
  destinationLocation?: string;
  contactPhoneMasked?: string;
}

const STEPS = [
  { id: "request_verified", label: "Request Verified", desc: "Requester phone & location verified", icon: ShieldCheck },
  { id: "donation_matched", label: "Donation Matched", desc: "Resource allocated to request", icon: Gift },
  { id: "volunteer_assigned", label: "Volunteer Assigned", desc: "Assigned to verified volunteer", icon: Truck },
  { id: "pickup_verified", label: "Pickup Verified", desc: "Donor OTP scanned & confirmed", icon: Package },
  { id: "in_transit", label: "In Transit", desc: "Telemetried route navigation active", icon: MapPin },
  { id: "delivery_verified", label: "Delivery Verified", desc: "Recipient OTP confirmed", icon: CheckCircle2 },
  { id: "completed", label: "Completed", desc: "Delivery completed & audited", icon: CheckCircle2 },
];

export function DonationTracker({
  donationId,
  itemName,
  quantity,
  unit,
  status = "MATCHED",
  pickupVerified = false,
  deliveryVerified = false,
  assignedVolunteerName = "Assigned Volunteer",
  pickupLocation = "Community Depot",
  destinationLocation = "Zone B Shelter",
  contactPhoneMasked = "+94 77 **** 419",
}: DonationTrackerProps) {

  const getCurrentStepIndex = () => {
    if (deliveryVerified || status === "COMPLETED") return 6;
    if (pickupVerified || status === "IN_TRANSIT") return 4;
    if (status === "ASSIGNED" || assignedVolunteerName) return 2;
    if (status === "MATCHED") return 1;
    return 0;
  };

  const currentStep = getCurrentStepIndex();

  return (
    <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 p-5 shadow-sm space-y-4 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-700 text-white shadow-2xs">
              ID: {donationId}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black border border-emerald-200">
              Verified Trust Flow
            </span>
          </div>
          <h3 className="text-base font-extrabold text-slate-900 mt-1">
            {quantity} {unit} of {itemName}
          </h3>
        </div>

        {/* Privacy Lock Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 shadow-2xs">
          <Lock size={13} className="text-emerald-600 shrink-0" />
          <span>Recipient Phone: <strong className="font-mono text-slate-800">{contactPhoneMasked}</strong></span>
        </div>
      </div>

      {/* Stepper Pipeline */}
      <div className="space-y-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Live Status Sequence</span>
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-1.5">
          {STEPS.map((step, idx) => {
            const isPassed = idx <= currentStep;
            const isCurrent = idx === currentStep;
            const Icon = step.icon;

            return (
              <div
                key={step.id}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  isCurrent
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 ring-2 ring-emerald-300 scale-102"
                    : isPassed
                    ? "bg-emerald-100/90 text-emerald-900 border-emerald-300 font-semibold"
                    : "bg-white/80 text-slate-400 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-center mb-1">
                  {isPassed ? <Icon size={16} /> : <Circle size={14} className="text-slate-300" />}
                </div>
                <p className="text-[10px] font-extrabold leading-tight">{step.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
        <div className="p-3 rounded-2xl bg-white border border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Pickup Location</span>
          <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
            <MapPin size={13} className="text-emerald-600" /> {pickupLocation}
          </p>
        </div>
        <div className="p-3 rounded-2xl bg-white border border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Destination</span>
          <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
            <MapPin size={13} className="text-sky-600" /> {destinationLocation}
          </p>
        </div>
        <div className="p-3 rounded-2xl bg-white border border-slate-200/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Volunteer</span>
          <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
            <Truck size={13} className="text-emerald-600" /> {assignedVolunteerName}
          </p>
        </div>
      </div>
    </div>
  );
}
