import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import React from "react";

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendDirection = "up",
  accentColor = "leaf"
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  accentColor?: "leaf" | "flood" | "amber" | "rose" | "purple";
}) {
  const colorMap = {
    leaf: "bg-emerald-50 text-emerald-600 border-emerald-100",
    flood: "bg-sky-50 text-sky-600 border-sky-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{String(value)}</div>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`rounded-lg border p-2.5 ${colorMap[accentColor] || colorMap.leaf}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={`font-semibold ${
              trendDirection === "up"
                ? "text-emerald-600"
                : trendDirection === "down"
                ? "text-rose-600"
                : "text-slate-500"
            }`}
          >
            {trendDirection === "up" ? "↑" : trendDirection === "down" ? "↓" : "•"} {trend}
          </span>
        </div>
      )}
    </div>
  );
}

export function MetricCard({
  title,
  value,
  explanation,
  trend,
  trendDirection = "up",
  icon: Icon,
  dark = false
}: {
  title: string;
  value: string | number;
  explanation: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  icon?: LucideIcon;
  dark?: boolean;
}) {
  if (dark) {
    return (
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/80 p-5 backdrop-blur-sm transition-all hover:border-slate-600">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
          {Icon && <Icon className="text-sky-400" size={18} />}
        </div>
        <div className="mt-2 text-3xl font-bold text-white">{String(value)}</div>
        {trend && (
          <div className="mt-1 text-xs font-medium text-sky-400">
            {trendDirection === "up" ? "▲" : trendDirection === "down" ? "▼" : "•"} {trend}
          </div>
        )}
        <p className="mt-2 text-xs text-slate-400">{explanation}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        {Icon && <Icon className="text-leaf" size={18} />}
      </div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{String(value)}</div>
      {trend && (
        <div
          className={`mt-1 text-xs font-semibold ${
            trendDirection === "up"
              ? "text-emerald-600"
              : trendDirection === "down"
              ? "text-rose-600"
              : "text-slate-500"
          }`}
        >
          {trendDirection === "up" ? "▲" : trendDirection === "down" ? "▼" : "•"} {trend}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500">{explanation}</p>
    </div>
  );
}

export function ActionCard({
  title,
  description,
  icon: Icon,
  buttonText,
  onClick,
  variant = "leaf"
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  buttonText: string;
  onClick: () => void;
  variant?: "leaf" | "flood" | "amber" | "slate";
}) {
  const styles = {
    leaf: {
      border: "hover:border-emerald-300",
      bg: "bg-emerald-50 text-emerald-700",
      btn: "bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20",
    },
    flood: {
      border: "hover:border-sky-300",
      bg: "bg-sky-50 text-sky-700",
      btn: "bg-sky-700 hover:bg-sky-800 text-white shadow-sky-700/20",
    },
    amber: {
      border: "hover:border-amber-300",
      bg: "bg-amber-50 text-amber-700",
      btn: "bg-amber-700 hover:bg-amber-800 text-white shadow-amber-700/20",
    },
    slate: {
      border: "hover:border-slate-300",
      bg: "bg-slate-100 text-slate-700",
      btn: "bg-slate-800 hover:bg-slate-900 text-white shadow-slate-900/20",
    },
  };

  const st = styles[variant];

  return (
    <div
      className={`group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${st.border}`}
    >
      <div>
        <div className={`inline-flex rounded-xl p-3 ${st.bg}`}>
          <Icon size={24} />
        </div>
        <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{description}</p>
      </div>
      <button
        onClick={onClick}
        className={`mt-6 w-full rounded-lg px-4 py-2.5 text-xs font-semibold shadow-sm transition-all ${st.btn}`}
      >
        {buttonText}
      </button>
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  icon: Icon,
  iconClassName,
  children,
  action,
  className = "",
  dark = false
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  dark?: boolean;
}) {
  if (dark) {
    return (
      <div className={`rounded-xl border border-slate-700/60 bg-slate-800/80 p-5 backdrop-blur-sm ${className}`}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {Icon && <Icon className={iconClassName ?? "text-sky-400"} size={18} />}
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            {Icon && <Icon className={iconClassName ?? "text-slate-500"} size={18} />}
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      {children}
    </div>
  );
}

const badgeTones: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-rose-50 text-rose-700 border-rose-200",
  blue: "bg-sky-50 text-sky-700 border-sky-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  neutral: "bg-slate-100 text-slate-600 border-slate-200"
};

export function Badge({
  children,
  tone = "neutral",
  pulse = false
}: {
  children: ReactNode;
  tone?: "green" | "amber" | "red" | "blue" | "purple" | "neutral";
  pulse?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeTones[tone]}`}>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
              tone === "green"
                ? "bg-emerald-400"
                : tone === "red"
                ? "bg-rose-400"
                : tone === "amber"
                ? "bg-amber-400"
                : "bg-sky-400"
            }`}
          />
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              tone === "green"
                ? "bg-emerald-500"
                : tone === "red"
                ? "bg-rose-500"
                : tone === "amber"
                ? "bg-amber-500"
                : "bg-sky-500"
            }`}
          />
        </span>
      )}
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
  pulse = false
}: {
  status: string;
  pulse?: boolean;
}) {
  const s = status.toLowerCase();
  let tone: "green" | "amber" | "red" | "blue" | "purple" | "neutral" = "neutral";

  if (["matched", "assigned", "completed", "verified", "active", "available"].includes(s)) {
    tone = "green";
  } else if (["pending", "needs attention", "amber", "pickup scheduled"].includes(s)) {
    tone = "amber";
  } else if (["declined", "cancelled", "failed", "red", "blocked", "disrupted"].includes(s)) {
    tone = "red";
  } else if (["in progress", "in_progress", "executing", "responding"].includes(s)) {
    tone = "blue";
  } else if (["normal mode", "disaster mode"].includes(s)) {
    tone = "purple";
  }

  return (
    <Badge tone={tone} pulse={pulse}>
      {status}
    </Badge>
  );
}

export function riskTone(risk: string | undefined | null): "green" | "amber" | "red" | "neutral" {
  if (risk === "green" || risk === "amber" || risk === "red") return risk;
  return "neutral";
}

export function EmptyState({ children, icon: Icon }: { children: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center text-sm text-slate-500">
      {Icon && <Icon className="mb-2 text-slate-400" size={32} />}
      {children}
    </div>
  );
}

export function Table({
  columns,
  children
}: {
  columns: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <table className="w-full min-w-max text-left text-xs">
        <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
          <tr>
            {columns.map((column) => (
              <th className="whitespace-nowrap px-4 py-3" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function ModeSwitch({
  mode,
  onToggle
}: {
  mode: "NORMAL" | "DISASTER";
  onToggle: (newMode: "NORMAL" | "DISASTER") => void;
}) {
  const isDisaster = mode === "DISASTER";
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900/90 p-1 backdrop-blur-md">
      <button
        onClick={() => onToggle("NORMAL")}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
          !isDisaster
            ? "bg-emerald-600 text-white shadow-sm"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <span className="h-2 w-2 rounded-full bg-emerald-300" />
        Normal Mode
      </button>
      <button
        onClick={() => onToggle("DISASTER")}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
          isDisaster
            ? "bg-rose-600 text-white shadow-sm animate-pulse-slow"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <span className="h-2 w-2 rounded-full bg-rose-300" />
        Disaster Mode
      </button>
    </div>
  );
}

