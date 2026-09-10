"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bell, BellOff, BellRing, AlertTriangle, CheckCircle2, HeartHandshake,
  Package, CheckSquare, ShieldAlert, X, MapPin, Clock, Users,
  Zap, ChevronRight, Truck, Heart, Flame
} from "lucide-react";
import { Panel, Badge } from "../../../components/ui";

// ─── Shared opportunity pool (localStorage-backed for cross-tab claim simulation) ───

export interface VolunteerOpp {
  id: string;
  title: string;
  description: string;
  location: string;
  urgency: "CRITICAL" | "HIGH" | "MEDIUM";
  category: "DELIVERY" | "MEDICAL" | "SHELTER" | "FOOD_DIST" | "RESCUE";
  peopleHelped: number;
  estimatedTime: string;
  claimedBy: string | null;   // null = available, string = userId who claimed
  postedAt: string;
}

const SEED_OPPS: VolunteerOpp[] = [
  {
    id: "OPP-001", title: "Emergency Food Delivery — Zone B",
    description: "Deliver 30 cooked meal packs from Community Hub to flood-displaced families at Rathmalana Shelter #3. Vehicle preferred.",
    location: "Rathmalana, Zone B → Shelter #3", urgency: "CRITICAL", category: "DELIVERY",
    peopleHelped: 30, estimatedTime: "~45 min", claimedBy: null, postedAt: "2 min ago",
  },
  {
    id: "OPP-002", title: "Water Distribution — Sector 4",
    description: "Assist with bottled water handout at the Zone A community centre. No vehicle needed.",
    location: "Zone A Community Centre", urgency: "HIGH", category: "FOOD_DIST",
    peopleHelped: 80, estimatedTime: "~2 hours", claimedBy: null, postedAt: "8 min ago",
  },
  {
    id: "OPP-003", title: "Medical Supply Run — Clinic to Shelter",
    description: "Transport first-aid kits and hygiene packs from St. Anne's Clinic to Zone B temporary shelter. Urgent.",
    location: "St. Anne Clinic → Zone B Shelter", urgency: "CRITICAL", category: "MEDICAL",
    peopleHelped: 50, estimatedTime: "~30 min", claimedBy: "other_user_42", postedAt: "14 min ago",
  },
  {
    id: "OPP-004", title: "Blanket & Clothing Distribution",
    description: "Hand out blankets and dry clothing at the Zone C evacuation point. Helpers of all ages welcome.",
    location: "Zone C Evacuation Point", urgency: "MEDIUM", category: "SHELTER",
    peopleHelped: 120, estimatedTime: "~3 hours", claimedBy: null, postedAt: "22 min ago",
  },
  {
    id: "OPP-005", title: "Elderly Assistance — Home Check",
    description: "Check on 6 elderly residents unable to evacuate in Sector 2. Provide water and assess their needs.",
    location: "Sector 2 Residential Area", urgency: "HIGH", category: "RESCUE",
    peopleHelped: 6, estimatedTime: "~1.5 hours", claimedBy: null, postedAt: "35 min ago",
  },
];

const STORAGE_KEY = "neighbornet_opp_pool";

function loadOpps(): VolunteerOpp[] {
  if (typeof window === "undefined") return SEED_OPPS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : SEED_OPPS;
  } catch { return SEED_OPPS; }
}

function saveOpps(opps: VolunteerOpp[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(opps));
  window.dispatchEvent(new Event("opp-pool-update"));
}

const MY_USER_ID = "current_user";

const urgencyMeta = {
  CRITICAL: { label: "Critical", bar: "bg-rose-500",   badge: "bg-rose-100 text-rose-700 border-rose-300",   border: "border-rose-300",  glow: "shadow-rose-100" },
  HIGH:     { label: "High",     bar: "bg-orange-500", badge: "bg-orange-100 text-orange-700 border-orange-300", border: "border-orange-200", glow: "shadow-orange-100" },
  MEDIUM:   { label: "Medium",   bar: "bg-amber-400",  badge: "bg-amber-100 text-amber-700 border-amber-300",   border: "border-amber-200",  glow: "shadow-amber-50"  },
};

const categoryIcon: Record<string, React.ReactNode> = {
  DELIVERY:  <Truck size={14} />,
  MEDICAL:   <Heart size={14} />,
  SHELTER:   <Package size={14} />,
  FOOD_DIST: <CheckSquare size={14} />,
  RESCUE:    <Flame size={14} />,
};

const systemAlerts = [
  { id: "ALT-001", title: "Disaster Alert: Flood Warning – Zone B", message: "Emergency response active. Volunteer drivers needed for food transport.", type: "DISASTER", severity: "RED",   time: "10 min ago" },
  { id: "ALT-002", title: "Request Matched!",                        message: "Your request REQ-004 (Dry Goods) matched with donor Central Pantry.",         type: "MATCH",    severity: "GREEN", time: "1 hr ago"   },
  { id: "ALT-003", title: "Task Assigned",                           message: "Assigned: deliver 5 food packages to Community Shelter A.",                    type: "TASK",     severity: "BLUE",  time: "3 hrs ago"  },
  { id: "ALT-004", title: "Donation Pickup Scheduled",               message: "Volunteer Alex M. scheduled pickup for your bottled water at 2:00 PM.",        type: "DONATION", severity: "AMBER", time: "Yesterday"  },
];

const severityStyle: Record<string, string> = {
  RED:   "border-rose-200 bg-rose-50/60",
  AMBER: "border-amber-200 bg-amber-50/60",
  GREEN: "border-emerald-200 bg-emerald-50/60",
  BLUE:  "border-sky-200 bg-sky-50/60",
};
const alertIcon: Record<string, React.ReactNode> = {
  DISASTER: <ShieldAlert size={18} className="text-rose-600" />,
  MATCH:    <CheckCircle2 size={18} className="text-emerald-600" />,
  TASK:     <CheckSquare size={18} className="text-sky-600" />,
  DONATION: <Package size={18} className="text-amber-600" />,
};

export default function CommunityAlertsPage() {
  const [notifActive, setNotifActive]       = useState(false);
  const [opps, setOpps]                     = useState<VolunteerOpp[]>([]);
  const [myDeclined, setMyDeclined]         = useState<Set<string>>(new Set());
  const [justActed, setJustActed]           = useState<Record<string, "accepted" | "declined">>({});

  // load pool
  const refreshOpps = useCallback(() => setOpps(loadOpps()), []);

  useEffect(() => {
    refreshOpps();
    window.addEventListener("opp-pool-update", refreshOpps);
    return () => window.removeEventListener("opp-pool-update", refreshOpps);
  }, [refreshOpps]);

  // simulate new opps appearing when notifications enabled
  useEffect(() => {
    if (!notifActive) return;
    const t = setTimeout(() => {
      const pool = loadOpps();
      // inject a live opp if not already present
      const liveId = "OPP-LIVE-1";
      if (!pool.find(o => o.id === liveId)) {
        const newOpp: VolunteerOpp = {
          id: liveId, title: "Urgent: Generator Transport — Hospital",
          description: "Transport 2 portable generators from Depot A to Zone B District Hospital. Heavy lifting needed. Van driver required.",
          location: "Depot A → Zone B District Hospital", urgency: "CRITICAL", category: "DELIVERY",
          peopleHelped: 200, estimatedTime: "~1 hour", claimedBy: null, postedAt: "Just now",
        };
        saveOpps([newOpp, ...pool]);
      }
    }, 1800);
    return () => clearTimeout(t);
  }, [notifActive]);

  const handleAccept = (oppId: string) => {
    const pool = loadOpps();
    const opp = pool.find(o => o.id === oppId);
    if (!opp || opp.claimedBy) return; // already claimed
    const updated = pool.map(o => o.id === oppId ? { ...o, claimedBy: MY_USER_ID } : o);
    saveOpps(updated);
    setJustActed(prev => ({ ...prev, [oppId]: "accepted" }));
  };

  const handleDecline = (oppId: string) => {
    setMyDeclined(prev => new Set([...prev, oppId]));
    setJustActed(prev => ({ ...prev, [oppId]: "declined" }));
  };

  const visibleOpps = notifActive
    ? opps.filter(o => !myDeclined.has(o.id))
    : [];

  const myAccepted = opps.filter(o => o.claimedBy === MY_USER_ID);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl transition-colors ${notifActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {notifActive ? <BellRing size={22} /> : <Bell size={22} />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Alerts & Notifications</h1>
            <p className="text-xs text-slate-500 mt-0.5">Stay updated and respond to volunteer opportunities in real time</p>
          </div>
        </div>

        {/* Notification toggle */}
        <button
          onClick={() => setNotifActive(v => !v)}
          className={`inline-flex items-center gap-2.5 rounded-xl border px-5 py-2.5 text-sm font-semibold shadow-sm transition-all ${
            notifActive
              ? "bg-emerald-600 border-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700"
              : "bg-white border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
          }`}
        >
          {notifActive ? (
            <><BellRing size={16} className="animate-pulse" /> Notifications Active</>
          ) : (
            <><BellOff size={16} /> Enable Notifications</>
          )}
        </button>
      </div>

      {/* ── Volunteer Opportunities (only when notifications active) ── */}
      {notifActive && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={15} className="text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Live Volunteering Opportunities</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                {visibleOpps.filter(o => !o.claimedBy).length} open
              </span>
            </div>
            {myAccepted.length > 0 && (
              <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full">
                ✓ {myAccepted.length} accepted — check Volunteer Tasks
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 -mt-1">
            Opportunities matched to your profile. Accept to claim a slot — once claimed by another volunteer it becomes unavailable.
          </p>

          {visibleOpps.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-5 text-sm text-slate-500">
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
              All available opportunities have been responded to. New ones will appear here automatically.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {visibleOpps.map((opp) => {
                const meta = urgencyMeta[opp.urgency];
                const isClaimedByMe = opp.claimedBy === MY_USER_ID;
                const isClaimedByOther = opp.claimedBy && opp.claimedBy !== MY_USER_ID;
                const acted = justActed[opp.id];

                return (
                  <div
                    key={opp.id}
                    className={`relative rounded-2xl border bg-white shadow-sm transition-all overflow-hidden ${
                      isClaimedByMe  ? "border-emerald-300 shadow-emerald-100" :
                      isClaimedByOther ? "border-slate-200 opacity-60" :
                      `${meta.border} ${meta.glow} shadow-sm`
                    }`}
                  >
                    {/* urgency bar */}
                    <div className={`h-1 w-full ${isClaimedByOther ? "bg-slate-300" : isClaimedByMe ? "bg-emerald-500" : meta.bar}`} />

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* category icon */}
                          <div className={`mt-0.5 p-2 rounded-xl shrink-0 ${
                            isClaimedByMe ? "bg-emerald-100 text-emerald-700" :
                            isClaimedByOther ? "bg-slate-100 text-slate-400" :
                            opp.urgency === "CRITICAL" ? "bg-rose-100 text-rose-700" :
                            opp.urgency === "HIGH" ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {categoryIcon[opp.category]}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold text-slate-900 leading-snug">{opp.title}</h3>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badge}`}>
                                {meta.label}
                              </span>
                              {isClaimedByOther && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                  Claimed by another volunteer
                                </span>
                              )}
                              {isClaimedByMe && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                  ✓ You accepted
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{opp.description}</p>

                            <div className="flex flex-wrap gap-3 mt-2.5 text-[11px] text-slate-500 font-medium">
                              <span className="flex items-center gap-1"><MapPin size={11} />{opp.location}</span>
                              <span className="flex items-center gap-1"><Clock size={11} />{opp.estimatedTime}</span>
                              <span className="flex items-center gap-1"><Users size={11} />{opp.peopleHelped} people helped</span>
                              <span className="text-slate-400">{opp.postedAt}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {isClaimedByMe ? (
                            <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700">
                              <CheckCircle2 size={14} /> Accepted
                            </div>
                          ) : isClaimedByOther ? (
                            <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-400">
                              Unavailable
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDecline(opp.id)}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all"
                              >
                                Decline
                              </button>
                              <button
                                onClick={() => handleAccept(opp.id)}
                                className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition-all ${
                                  opp.urgency === "CRITICAL"
                                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                                    : opp.urgency === "HIGH"
                                    ? "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20"
                                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                                }`}
                              >
                                Accept <ChevronRight size={13} className="inline -mt-0.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Notification disabled callout ── */}
      {!notifActive && (
        <div className="flex items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-5">
          <div className="p-3 rounded-xl bg-slate-100 text-slate-400"><BellOff size={20} /></div>
          <div>
            <p className="text-sm font-bold text-slate-700">Volunteer notifications are off</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Enable notifications to receive live volunteering opportunities matched to your skills and location. You can accept or decline each one.
            </p>
          </div>
          <button
            onClick={() => setNotifActive(true)}
            className="ml-auto shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold shadow-sm transition-all"
          >
            Enable
          </button>
        </div>
      )}

      {/* ── System Alerts ── */}
      <Panel title="System Notifications" subtitle="Request matches, task assignments, and disaster alerts">
        <div className="space-y-2.5">
          {systemAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start justify-between rounded-xl border p-3.5 transition-all ${severityStyle[alert.severity]}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{alertIcon[alert.type]}</div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{alert.title}</h3>
                  <p className="text-xs mt-1 text-slate-600 leading-relaxed">{alert.message}</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 shrink-0 ml-4 mt-0.5">{alert.time}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
