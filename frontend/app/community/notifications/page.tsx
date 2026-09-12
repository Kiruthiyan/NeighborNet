"use client";

import { useState } from "react";
import { Bell, ShieldAlert, CheckCircle2, AlertTriangle, Users, RotateCcw, Clock, MapPin, Sparkles } from "lucide-react";

interface NotificationItem {
  id: string;
  recipient: "VOLUNTEER" | "COORDINATOR";
  type: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  priority: "HIGH" | "MEDIUM" | "NORMAL";
}

export default function NotificationsPage() {
  const [tab, setTab] = useState<"VOLUNTEER" | "COORDINATOR">("VOLUNTEER");

  const [items, setItems] = useState<NotificationItem[]>([
    // Volunteer notifications
    {
      id: "v1",
      recipient: "VOLUNTEER",
      type: "New nearby relief alert",
      title: "🚨 New Relief Alert: Flood Assistance – Zone B",
      message: "45 people affected. Drinking water & food required by 6:00 PM. Accepting makes you eligible for assignment.",
      time: "10:33 AM",
      read: false,
      priority: "HIGH",
    },
    {
      id: "v2",
      recipient: "VOLUNTEER",
      type: "Alert accepted",
      title: "✅ Alert Accepted",
      message: "You accepted the Flood Assistance alert. Status: Accepted / Eligible for assignment by PlanningEngine.",
      time: "10:35 AM",
      read: true,
      priority: "NORMAL",
    },
    {
      id: "v3",
      recipient: "VOLUNTEER",
      type: "Task assigned",
      title: "🎯 Task Assigned: Deliver 50 meal packs",
      message: "Assigned by PlanningEngine. Pickup: Community Food Center -> Destination: Zone B Shelter.",
      time: "10:36 AM",
      read: false,
      priority: "HIGH",
    },
    {
      id: "v4",
      recipient: "VOLUNTEER",
      type: "Route/task update",
      title: "📍 Route Update: Zone B Main Access Road Open",
      message: "Clear weather advisory updated. Preferred route evaluated as safe.",
      time: "10:40 AM",
      read: fontTrue(),
      priority: "NORMAL",
    },

    // Coordinator notifications
    {
      id: "c1",
      recipient: "COORDINATOR",
      type: "AMBER decision required",
      title: "⚠️ AMBER Safety Decision Needed: Task Reassignment",
      message: "Volunteer B cancelled due to vehicle breakdown. RecoveryEngine recommends reassigning to Volunteer C.",
      time: "10:42 AM",
      read: false,
      priority: "HIGH",
    },
    {
      id: "c2",
      recipient: "COORDINATOR",
      type: "New urgent request",
      title: "🚨 Urgent Assistance Request: Flood – Zone B",
      message: "Request REQ-FLOOD-8092 created for 45 affected residents.",
      time: "10:32 AM",
      read: true,
      priority: "HIGH",
    },
    {
      id: "c3",
      recipient: "COORDINATOR",
      type: "Recovery required",
      title: "🔄 RecoveryEngine Triggered",
      message: "Disruption reported on task-101. 2 unaffected tasks left untouched.",
      time: "10:41 AM",
      read: true,
      priority: "MEDIUM",
    },
  ]);

  function fontTrue() {
    return true;
  }

  const filtered = items.filter((i) => i.recipient === tab);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-sky-100 text-sky-700">
            <Bell size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">NeighborNet Notification Center</h1>
            <p className="text-xs text-slate-500 mt-0.5">Real-time alerts for Volunteers and Operations Coordinators</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
          <button
            onClick={() => setTab("VOLUNTEER")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === "VOLUNTEER"
                ? "bg-white text-sky-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Volunteer Notifications
          </button>
          <button
            onClick={() => setTab("COORDINATOR")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tab === "COORDINATOR"
                ? "bg-white text-purple-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Coordinator Alerts
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-xl border transition-all ${
              !item.read
                ? "bg-sky-50/60 border-sky-200 shadow-xs"
                : "bg-white border-slate-200/80"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-900">{item.title}</span>
                  {!item.read && (
                    <span className="px-2 py-0.5 rounded-full bg-sky-600 text-white text-[9px] font-black uppercase">
                      NEW
                    </span>
                  )}
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {item.type}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{item.message}</p>
              </div>

              <span className="text-[10px] font-mono text-slate-400 shrink-0">{item.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
