"use client";

import { useState } from "react";
import { Activity, HeartHandshake, Package, CheckSquare, Clock } from "lucide-react";
import { Panel } from "../../../components/ui";

export default function CommunityActivityPage() {
  const [filter, setFilter] = useState<"ALL" | "REQUESTS" | "DONATIONS" | "VOLUNTEER">("ALL");

  const activities = [
    {
      id: "ACT-01",
      category: "REQUESTS",
      title: "Created Request REQ-005",
      details: "Requested 10 cases of bottled water for Zone 3 Community Center.",
      time: "2 hours ago",
      icon: HeartHandshake,
      color: "text-amber-600 bg-amber-50 border-amber-200",
    },
    {
      id: "ACT-02",
      category: "DONATIONS",
      title: "Registered Donation RES-012",
      details: "Offered 50 surplus boxed lunches from local catering donor.",
      time: "5 hours ago",
      icon: Package,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    {
      id: "ACT-03",
      category: "VOLUNTEER",
      title: "Completed Delivery Task TSK-089",
      details: "Delivered emergency medical kit to Shelter B safely.",
      time: "1 day ago",
      icon: CheckSquare,
      color: "text-sky-600 bg-sky-50 border-sky-200",
    },
    {
      id: "ACT-04",
      category: "VOLUNTEER",
      title: "Accepted Disaster Alert",
      time: "2 days ago",
      details: "Joined disaster response team for North Zone Heavy Rainfall.",
      icon: Activity,
      color: "text-purple-600 bg-purple-50 border-purple-200",
    },
  ];

  const filtered = filter === "ALL" ? activities : activities.filter((a) => a.category === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Activity className="text-emerald-600" size={24} />
          Community Activity Log
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          A full audit trail of your contributions, requests, and volunteer activities.
        </p>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {(["ALL", "REQUESTS", "DONATIONS", "VOLUNTEER"] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              filter === cat
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {cat === "ALL" ? "All Activity" : cat.charAt(0) + cat.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <Panel title="Timeline of Activity">
        <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 py-2">
          {filtered.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="relative pl-6">
                <div
                  className={`absolute -left-[17px] top-0.5 flex h-8 w-8 items-center justify-center rounded-full border ${item.color}`}
                >
                  <Icon size={16} />
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                      <Clock size={12} /> {item.time}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{item.details}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
