"use client";

import { useState, useEffect } from "react";
import { Kanban, MapPin, AlertCircle, CheckCircle, Clock, ArrowRight, ShieldCheck } from "lucide-react";
import { Badge, EmptyState, riskTone } from "../../../components/ui";
import { apiGet } from "../../../lib/api";
import { formatLocation } from "../../../lib/format";

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
    { title: "Available", status: "AVAILABLE", color: "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50" },
    { title: "Accepted", status: "ACCEPTED", color: "border-sky-200 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-950/20" },
    { title: "Assigned", status: "ASSIGNED", color: "border-sky-200 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-950/20" },
    { title: "In Progress", status: "IN_PROGRESS", color: "border-sky-200 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-950/20" },
    { title: "Completed", status: "COMPLETED", color: "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-950/20" },
  ];

  return (
    <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Kanban className="text-sky-600 dark:text-sky-400" size={24} />
          Active Logistics Task Kanban Board
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Real-time logistics dispatch pipeline, risk assessments, and volunteer routing.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading task pipeline...</div>
      ) : (
        <div className="flex flex-col md:flex-row gap-4 overflow-x-auto pb-4">
          {columns.map((col) => {
            const colTasks = tasks.filter(
              (t) => (t.status || "AVAILABLE").toUpperCase() === col.status
            );

            return (
              <div key={col.status} className={`rounded-xl border p-4 ${col.color} min-w-[220px] md:flex-1`}>
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">{col.title}</h3>
                    <span className="rounded-full bg-white dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-transparent">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {colTasks.map((task) => (
                      <div
                        key={task.id || task.task_id}
                        className="rounded-xl border border-slate-200 bg-white dark:border-slate-700/80 dark:bg-slate-800 p-3 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400">
                            {task.task_id || task.id || "TSK-001"}
                          </span>
                          <Badge tone={riskTone(String(task.risk_level || "green").toLowerCase())}>
                            {task.risk_level || "Green"}
                          </Badge>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">{task.task_type || "DELIVERY"}</h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1">
                          <MapPin size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
                          <span className="truncate">{formatLocation(task.pickup_location, "Hub")} → {formatLocation(task.delivery_location || task.destination, "Dest")}</span>
                        </p>
                        {task.volunteer_id && (
                          <p className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 mt-2 border-t border-slate-100 dark:border-slate-700/60 pt-1.5">
                            Assigned: {task.volunteer_id}
                          </p>
                        )}
                      </div>
                    ))}

                    {colTasks.length === 0 && (
                      <div className="py-6 text-center text-[11px] text-slate-400 dark:text-slate-600 italic">No tasks</div>
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
