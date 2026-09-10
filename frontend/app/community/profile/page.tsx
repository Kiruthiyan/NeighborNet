"use client";

import { useState } from "react";
import { User, Shield, HeartHandshake, Package, CheckSquare, ShieldAlert, Check, AlertCircle } from "lucide-react";
import { useAuth } from "../../../lib/auth";
import { Panel } from "../../../components/ui";
import { updateMyCapabilities } from "../../../lib/api";

export default function CommunityProfilePage() {
  const { user, refreshUser } = useAuth();
  const [isDonor, setIsDonor] = useState(user?.is_donor ?? false);
  const [isVolunteer, setIsVolunteer] = useState(user?.is_volunteer ?? false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSaveCapabilities = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await updateMyCapabilities({ is_donor: isDonor, is_volunteer: isVolunteer });
      if (refreshUser) await refreshUser();
      setMessage("Account capabilities updated successfully!");
    } catch (err: any) {
      setError(err?.message || "Failed to update capabilities");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <User className="text-emerald-600" size={24} />
          My Profile & Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your personal account details, notification preferences, and community role capabilities.
        </p>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
          <Check size={16} /> {message}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Account Info */}
      <Panel title="Personal Account Information" icon={User}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Full Name</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{user?.name || "Member"}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{user?.email || "user@example.com"}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account ID</p>
            <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">{user?.user_id || "USR-101"}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Verification</p>
            <p className="text-xs font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
              <Check size={14} /> Verified Member
            </p>
          </div>
        </div>
      </Panel>

      {/* Community Capabilities Settings */}
      <Panel title="Community Role Capabilities" icon={Shield}>
        <p className="text-xs text-slate-600 mb-4">
          Select which modes of participation you wish to enable for your account. You can change these at any time.
        </p>

        <div className="space-y-4">
          {/* Recipient - Always On */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <HeartHandshake size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Resource Recipient (Community Member)</h4>
                <p className="text-[11px] text-slate-600">Request food, medical items, or emergency help from local donors.</p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-200/60 px-2.5 py-1 rounded-full">
              Enabled (Default)
            </span>
          </div>

          {/* Donor - Opt In/Out */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <Package size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Resource Donor</h4>
                <p className="text-[11px] text-slate-600">Register surplus meals, groceries, or supplies for distribution.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsDonor(!isDonor)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                isDonor ? "bg-emerald-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isDonor ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Volunteer - Opt In/Out */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-100 text-sky-700">
                <CheckSquare size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Community Volunteer</h4>
                <p className="text-[11px] text-slate-600">Receive delivery tasks and assist during local emergency responses.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsVolunteer(!isVolunteer)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                isVolunteer ? "bg-emerald-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isVolunteer ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveCapabilities}
            disabled={saving}
            className="rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 py-2.5 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
          >
            {saving ? "Saving Changes..." : "Save Preferences"}
          </button>
        </div>
      </Panel>

      {/* Coordinator Notice */}
      <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert className="text-sky-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-xs font-bold text-sky-900">Need Coordinator Access?</h4>
            <p className="text-xs text-sky-800 mt-1 leading-relaxed">
              Coordinator access is granted by an administrator via invitation or administrative role promotion. Contact your organization coordinator if you require emergency operations access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
