"use client";

import { useState, useEffect } from "react";
import { Kanban, MapPin, AlertCircle, CheckCircle, Clock, ArrowRight, ShieldCheck } from "lucide-react";
import { Panel, StatusBadge, EmptyState } from "../../../components/ui";
import { apiGet } from "../../../lib/api";

export default function OpsTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      try {
        const data = await apiGet<any[]>("/tasks", []);
        setTasks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load tasks", err);
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, []);

  const columns = [
    { title: "Available", status: "AVAILABLE", color: "border-slate-700 bg-slate-900/50" },
    { title: "Accepted", status: "ACCEPTED", color: "border-sky-500/30 bg-sky-950/20" },
    { title: "Assigned", status: "ASSIGNED", color: "border-purple-500/30 bg-purple-950/20" },
    { title: "In Progress", status: "IN_PROGRESS", color: "border-amber-500/30 bg-amber-950/20" },
    { title: "Completed", status: "COMPLETED", color: "border-emerald-500/30 bg-emerald-950/20" },
  ];

  return (
    <div className="space-y-6 animate-fade-in text-slate-100 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Kanban className="text-sky-400" size={24} />
          Active Logistics Task Kanban Board
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Real-time logistics dispatch pipeline, risk assessments, and volunteer routing.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading task pipeline...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {columns.map((col) => {
            const colTasks = tasks.filter(
              (t) => (t.status || "AVAILABLE").toUpperCase() === col.status
            );

            return (
              <div key={col.status} className={`rounded-xl border p-4 ${col.color} min-w-[220px] flex flex-col justify-between`}>
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{col.title}</h3>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {colTasks.map((task) => (
                      <div
                        key={task.id || task.task_id}
                        className="rounded-xl border border-slate-700/80 bg-slate-800 p-3 shadow-xs hover:border-slate-600 transition-all"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-mono font-bold text-sky-400">
                            {task.task_id || task.id || "TSK-001"}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.2 rounded">
                            {task.risk_level || "Green"}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white leading-snug">{task.task_type || "DELIVERY"}</h4>
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <MapPin size={11} className="text-slate-500 shrink-0" />
                          <span className="truncate">{task.pickup_location || "Hub"} → {task.delivery_location || "Dest"}</span>
                        </p>
                        {task.volunteer_id && (
                          <p className="text-[10px] font-semibold text-sky-300 mt-2 border-t border-slate-700/60 pt-1.5">
                            Assigned: {task.volunteer_id}
                          </p>
                        )}
                      </div>
                    ))}

                    {colTasks.length === 0 && (
                      <div className="py-6 text-center text-[11px] text-slate-600 italic">No tasks</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
