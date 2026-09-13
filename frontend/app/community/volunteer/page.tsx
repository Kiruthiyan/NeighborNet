"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { CheckSquare, ShieldCheck, MapPin, Package, Loader2, AlertCircle, QrCode, Truck } from "lucide-react";
import { Panel, Table, StatusBadge, EmptyState, Timeline, TimelineStep } from "../../../components/ui";
import { getTasks, getMyVolunteer, acceptTask, CoordinationTask, Volunteer } from "../../../lib/api";
import { VerificationModal } from "../../../components/VerificationModal";
import { TaskNavigationCard } from "../../../components/TaskNavigationCard";
import { formatLocation, formatDate } from "../../../lib/format";

// Real Lifecycle Timeline for a volunteer's own task, driven only by
// backend-confirmed fields (status/pickup_verified/delivery_verified) -
// never a client-side simulation.
function buildVolunteerTimeline(task: CoordinationTask): TimelineStep[] {
  return [
    { label: "Accepted", done: !!task.volunteer_id },
    { label: "Pickup Verified", done: !!task.pickup_verified },
    { label: "In Progress", done: task.status === "in_progress" || task.status === "completed" },
    { label: "Delivered", done: !!task.delivery_verified },
    { label: "Completed", done: task.status === "completed" }
  ];
}

export default function CommunityVolunteerPage() {
  const [tasks, setTasks] = useState<CoordinationTask[]>([]);
  const [myVolunteer, setMyVolunteer] = useState<Volunteer | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const [verModal, setVerModal] = useState<{ isOpen: boolean; taskId: string; type: "pickup" | "delivery" }>({
    isOpen: false,
    taskId: "",
    type: "pickup"
  });

  const refresh = useCallback(async () => {
    const [taskList, volunteer] = await Promise.all([getTasks(), getMyVolunteer()]);
    setTasks(Array.isArray(taskList) ? taskList : []);
    setMyVolunteer(volunteer);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const myTasks = useMemo(
    () => (myVolunteer ? tasks.filter((t) => t.volunteer_id === myVolunteer.volunteer_id) : []),
    [tasks, myVolunteer]
  );
  const availableTasks = useMemo(
    () => tasks.filter((t) => (t.status === "available" || t.status === "alerted") && !t.volunteer_id),
    [tasks]
  );

  const handleAccept = async (taskId: string) => {
    setActionError(null);
    setAcceptingId(taskId);
    try {
      await acceptTask(taskId, myVolunteer?.volunteer_id);
      await refresh();
    } catch (err: any) {
      setActionError(err?.message || "Failed to accept task.");
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-sky-100 text-sky-700">
          <CheckSquare size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Volunteer Tasks</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Accept tasks and track real delivery progress from the backend - status only, refreshed every few seconds.
          </p>
        </div>
      </div>

      {!myVolunteer && !loading && (
        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          No volunteer profile is linked to your account yet, so you can&apos;t accept tasks.
        </div>
      )}

      {actionError && (
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" /> {actionError}
        </div>
      )}

      {/* Available tasks to accept */}
      <Panel title="Available Tasks" icon={Package} iconClassName="text-amber-600" subtitle="Real unclaimed tasks you can accept">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading tasks…</div>
        ) : availableTasks.length === 0 ? (
          <EmptyState icon={Package}>
            <p className="font-semibold text-slate-700">No available tasks right now</p>
            <p className="text-xs text-slate-500 mt-1">Check back soon - coordinators create tasks as requests are matched.</p>
          </EmptyState>
        ) : (
          <Table columns={["Task", "Route", "Priority", "Status", "Action"]}>
            {availableTasks.map((task) => (
              <tr key={task.task_id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3 font-mono font-bold text-xs text-slate-700">{task.task_id}</td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <MapPin size={11} className="text-slate-400" />
                    {formatLocation(task.pickup_location, "Hub")} → {formatLocation(task.destination, "Recipient")}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-semibold text-slate-700">{task.priority}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={task.status} />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleAccept(task.task_id)}
                    disabled={!myVolunteer || acceptingId === task.task_id}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold text-[11px] shadow-2xs transition-colors flex items-center gap-1"
                  >
                    {acceptingId === task.task_id ? <Loader2 size={12} className="animate-spin" /> : "Accept"}
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      {/* My tasks - real progress tracking */}
      <Panel
        title="My Tasks"
        icon={ShieldCheck}
        iconClassName="text-emerald-600"
        subtitle="Real backend-confirmed progress for tasks assigned to you"
      >
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading tasks…</div>
        ) : myTasks.length === 0 ? (
          <EmptyState icon={CheckSquare}>
            <p className="font-semibold text-slate-700">No tasks assigned to you yet</p>
            <p className="text-xs text-slate-500 mt-1">Accept an available task above to get started.</p>
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {myTasks.map((task) => (
              <div key={task.task_id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-mono font-bold text-slate-700">{task.task_id}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="text-slate-400" />
                      {formatLocation(task.pickup_location, "Hub")} → {formatLocation(task.destination, "Recipient")}
                    </p>
                  </div>
                  <StatusBadge status={task.status} pulse={task.status === "in_progress"} />
                </div>

                <Timeline steps={buildVolunteerTimeline(task)} />

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  {!task.pickup_verified && task.status !== "completed" && task.status !== "cancelled" && (
                    <button
                      onClick={() => setVerModal({ isOpen: true, taskId: task.task_id, type: "pickup" })}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] shadow-2xs flex items-center gap-1"
                    >
                      <QrCode size={12} /> Verify Pickup
                    </button>
                  )}
                  {task.pickup_verified && !task.delivery_verified && (
                    <button
                      onClick={() => setVerModal({ isOpen: true, taskId: task.task_id, type: "delivery" })}
                      className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-[11px] shadow-2xs flex items-center gap-1"
                    >
                      <QrCode size={12} /> Verify Delivery
                    </button>
                  )}
                  {task.status === "completed" ? (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <Truck size={12} /> Completed{task.updated_at ? ` · ${formatDate(task.updated_at)}` : ""}
                    </span>
                  ) : (
                    (task.status === "assigned" || task.status === "in_progress") && (
                      <TaskNavigationCard taskId={task.task_id} volunteerId={myVolunteer?.volunteer_id} onTaskRecovered={refresh} />
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <VerificationModal
        isOpen={verModal.isOpen}
        onClose={() => setVerModal((prev) => ({ ...prev, isOpen: false }))}
        taskId={verModal.taskId}
        verificationType={verModal.type}
        onSuccess={refresh}
      />
    </div>
  );
}
