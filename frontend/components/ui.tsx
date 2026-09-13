import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Copy, Check, AlertTriangle, X, Loader2 } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────
   SPINNER
   ──────────────────────────────────────────────────────────────── */
export function Spinner({
  size = "md",
  className = "",
  color = "leaf"
}: {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  color?: "leaf" | "sky" | "white" | "slate";
}) {
  const sizeMap = { xs: "h-3 w-3", sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" };
  const borderMap = {
    leaf: "border-emerald-600 border-t-transparent",
    sky: "border-sky-500 border-t-transparent",
    white: "border-white border-t-transparent",
    slate: "border-slate-400 border-t-transparent"
  };
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-spin rounded-full border-2 ${sizeMap[size]} ${borderMap[color]} ${className}`}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────
   CONFIRM MODAL  (replaces browser confirm() dialogs)
   ──────────────────────────────────────────────────────────────── */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  confirmClass = "bg-rose-600 hover:bg-rose-500 text-white",
  loading = false
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  confirmClass?: string;
  loading?: boolean;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-slide-up">
        <div className="flex items-start gap-4 p-6 border-b border-slate-100">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="confirm-modal-title" className="text-base font-bold text-slate-900">{title}</h3>
            <div className="mt-1 text-sm text-slate-600">{message}</div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <button
            ref={cancelRef}
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors focus-visible:outline-emerald-500"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold shadow-sm transition-all disabled:opacity-50 ${confirmClass}`}
          >
            {loading && <Spinner size="xs" color="white" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   COPY BUTTON
   ──────────────────────────────────────────────────────────────── */
export function CopyButton({
  text,
  label,
  size = "sm",
  className = ""
}: {
  text: string;
  label?: string;
  size?: "xs" | "sm";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  const iconSize = size === "xs" ? 11 : 13;

  return (
    <button
      onClick={handleCopy}
      title={`Copy ${label || text}`}
      aria-label={copied ? "Copied!" : `Copy ${label || text}`}
      className={`inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-xs font-medium transition-all
        ${copied
          ? "bg-emerald-100 text-emerald-700"
          : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
        } ${className}`}
    >
      {copied ? <Check size={iconSize} /> : <Copy size={iconSize} />}
      {label && <span>{copied ? "Copied" : label}</span>}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────
   CARD
   ──────────────────────────────────────────────────────────────── */
export function Card({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-800/80 dark:backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   BUTTON
   ──────────────────────────────────────────────────────────────── */
const buttonVariants: Record<string, string> = {
  primary: "bg-sky-600 hover:bg-sky-700 text-white shadow-sm disabled:hover:bg-sky-600",
  secondary: "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700",
  danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-sm disabled:hover:bg-rose-600",
  ghost: "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
};

const buttonSizes: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm"
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
    >
      {loading && <Spinner size="xs" color={variant === "secondary" || variant === "ghost" ? "slate" : "white"} />}
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────
   INPUT & SELECT
   ──────────────────────────────────────────────────────────────── */
const fieldClass =
  "rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 py-2 text-sm focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...rest }, ref) {
    return <input ref={ref} {...rest} className={`${fieldClass} ${className}`} />;
  }
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", children, ...rest }, ref) {
    return (
      <select ref={ref} {...rest} className={`${fieldClass} ${className}`}>
        {children}
      </select>
    );
  }
);

/* ─────────────────────────────────────────────────────────────────
   SKELETON ROW  (table loading placeholder)
   ──────────────────────────────────────────────────────────────── */
export function SkeletonRow({ columns }: { columns: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <span className="skeleton dark:skeleton-dark inline-block h-4 w-full max-w-[8rem]">&nbsp;</span>
        </td>
      ))}
    </tr>
  );
}

/* ─────────────────────────────────────────────────────────────────
   STAT CARD
   ──────────────────────────────────────────────────────────────── */
export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendDirection = "up",
  accentColor = "leaf",
  loading = false
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  accentColor?: "leaf" | "sky" | "flood" | "amber" | "rose" | "purple";
  loading?: boolean;
}) {
  const colorMap = {
    leaf: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800",
    sky: "bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-800",
    flood: "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800",
    amber: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800",
    rose: "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800",
    purple: "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/80 dark:backdrop-blur-sm dark:hover:border-slate-600">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</p>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {loading
              ? <span className="skeleton inline-block h-8 w-16">&nbsp;</span>
              : String(value)
            }
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`rounded-lg border p-2.5 shrink-0 ${colorMap[accentColor] || colorMap.leaf}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={`font-semibold ${
              trendDirection === "up"
                ? "text-sky-600 dark:text-sky-400"
                : trendDirection === "down"
                ? "text-slate-600 dark:text-slate-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {trendDirection === "up" ? "↑" : trendDirection === "down" ? "↓" : "•"} {trend}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   METRIC CARD
   ──────────────────────────────────────────────────────────────── */
export function MetricCard({
  title,
  value,
  explanation,
  trend,
  trendDirection = "up",
  icon: Icon,
  dark = false, // Kept for prop compatibility, but handled responsively now
  loading = false
}: {
  title: string;
  value: string | number;
  explanation: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  icon?: LucideIcon;
  dark?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/80 dark:backdrop-blur-sm dark:hover:border-slate-600">
      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">{title}</span>
        {Icon && <Icon className="text-leaf shrink-0 dark:text-sky-400" size={18} />}
      </div>
      <div className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
        {loading
          ? <span className="skeleton dark:skeleton-dark inline-block h-8 w-16">&nbsp;</span>
          : String(value)
        }
      </div>
      {trend && (
        <div
          className={`mt-1 text-xs font-semibold ${
            trendDirection === "up"
              ? "text-sky-600 dark:text-sky-400"
              : trendDirection === "down"
              ? "text-slate-600 dark:text-slate-400"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          {trendDirection === "up" ? "▲" : trendDirection === "down" ? "▼" : "•"} {trend}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{explanation}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ACTION CARD
   ──────────────────────────────────────────────────────────────── */
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
      border: "hover:border-sky-300 dark:hover:border-sky-600",
      bg: "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400",
      btn: "bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20"
    },
    flood: {
      border: "hover:border-slate-300 dark:hover:border-slate-600",
      bg: "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-400",
      btn: "bg-slate-800 hover:bg-slate-900 text-white shadow-slate-900/20"
    },
    amber: {
      border: "hover:border-slate-300 dark:hover:border-slate-600",
      bg: "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-400",
      btn: "bg-slate-800 hover:bg-slate-900 text-white shadow-slate-900/20"
    },
    slate: {
      border: "hover:border-slate-300 dark:hover:border-slate-600",
      bg: "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-400",
      btn: "bg-slate-800 hover:bg-slate-900 text-white shadow-slate-900/20"
    }
  } as const;

  const st = styles[variant] ?? styles.slate;

  return (
    <div
      className={`group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/80 dark:backdrop-blur-sm ${st.border}`}
    >
      <div>
        <div className={`inline-flex rounded-xl p-3 ${st.bg}`}>
          <Icon size={24} />
        </div>
        <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
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

/* ─────────────────────────────────────────────────────────────────
   PANEL
   ──────────────────────────────────────────────────────────────── */
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
  return (
    <div className={`rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/80 dark:backdrop-blur-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {Icon && <Icon className={iconClassName ?? "text-slate-500 dark:text-sky-400"} size={18} />}
            <span className="truncate">{title}</span>
          </h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   BADGE & STATUS BADGE
   ──────────────────────────────────────────────────────────────── */
const badgeTones: Record<string, string> = {
  green:   "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  amber:   "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  red:     "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  blue:    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
  purple:  "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  neutral: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
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
              tone === "red" ? "bg-rose-400" : "bg-sky-400"
            }`}
          />
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              tone === "red" ? "bg-rose-500" : "bg-sky-500"
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
  const s = status.toLowerCase().replace(/_/g, " ");
  let tone: "green" | "amber" | "red" | "blue" | "purple" | "neutral" = "neutral";

  if (["matched", "assigned", "completed", "verified", "active", "available", "emailed"].includes(s)) {
    tone = "green";
  } else if (["pending", "needs attention", "amber", "pickup scheduled", "link only"].includes(s)) {
    tone = "amber";
  } else if (["declined", "cancelled", "failed", "red", "blocked", "disrupted", "disabled", "revoked"].includes(s)) {
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

/* ─────────────────────────────────────────────────────────────────
   RISK TONE HELPER
   ──────────────────────────────────────────────────────────────── */
export function riskTone(risk: string | undefined | null): "green" | "amber" | "red" | "neutral" {
  if (risk === "green" || risk === "amber" || risk === "red") return risk;
  return "neutral";
}

/* ─────────────────────────────────────────────────────────────────
   EMPTY STATE
   ──────────────────────────────────────────────────────────────── */
export function EmptyState({
  children,
  icon: Icon,
  dark = false
}: {
  children: ReactNode;
  icon?: LucideIcon;
  dark?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
      {Icon && <Icon className="mb-3 text-slate-400 dark:text-slate-600" size={32} />}
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   TABLE
   ──────────────────────────────────────────────────────────────── */
export function Table({
  columns,
  children
}: {
  columns: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-800/80">
      <table className="nn-table w-full min-w-max text-left text-xs text-slate-700 dark:text-slate-300">
        <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-700">
          <tr>
            {columns.map((column) => (
              <th className="whitespace-nowrap px-4 py-3" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MODE SWITCH
   ──────────────────────────────────────────────────────────────── */
export function ModeSwitch({
  mode,
  onToggle
}: {
  mode: "NORMAL" | "DISASTER";
  onToggle: (newMode: "NORMAL" | "DISASTER") => void;
}) {
  const isDisaster = mode === "DISASTER";
  return (
    <div
      className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/90 dark:backdrop-blur-md"
      role="group"
      aria-label="Operating mode selector"
    >
      <button
        onClick={() => onToggle("NORMAL")}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
          !isDisaster
            ? "bg-sky-600 text-white shadow-sm"
            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
        aria-pressed={!isDisaster}
      >
        <span className="h-2 w-2 rounded-full bg-sky-200 dark:bg-sky-300" />
        Normal Mode
      </button>
      <button
        onClick={() => onToggle("DISASTER")}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
          isDisaster
            ? "bg-rose-600 text-white shadow-sm animate-pulse-slow"
            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
        aria-pressed={isDisaster}
      >
        <span className="h-2 w-2 rounded-full bg-rose-200 dark:bg-rose-300" />
        Disaster Mode
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   INLINE ALERT BANNER
   ──────────────────────────────────────────────────────────────── */
export function AlertBanner({
  tone = "amber",
  children,
  onDismiss
}: {
  tone?: "amber" | "red" | "green" | "blue";
  children: ReactNode;
  onDismiss?: () => void;
}) {
  const toneMap = {
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    red:   "bg-rose-50 border-rose-200 text-rose-800",
    green: "bg-emerald-50 border-emerald-200 text-emerald-800",
    blue:  "bg-sky-50 border-sky-200 text-sky-800"
  };
  return (
    <div className={`flex items-start gap-2 rounded-xl border p-3.5 text-sm ${toneMap[tone]}`} role="alert">
      <span className="flex-1">{children}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   TIMELINE (progress stepper) - shared between requester and volunteer
   real-status tracking views. Reflects only what the `done` flags say;
   callers must derive those from real backend state, never guess/fake.
   ──────────────────────────────────────────────────────────────── */
export interface TimelineStep {
  label: string;
  done: boolean;
}

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="relative flex items-center justify-between">
      <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1.5 bg-slate-200 -z-0 rounded-full" />
      {steps.map((step, i) => (
        <div key={step.label} className="relative z-10 flex flex-col items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
              step.done
                ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "bg-white border-slate-300 text-slate-400"
            }`}
          >
            {step.done ? <Check size={15} strokeWidth={3} /> : i + 1}
          </div>
          <span className="text-[11px] font-bold text-slate-700 mt-1.5 whitespace-nowrap">{step.label}</span>
        </div>
      ))}
    </div>
  );
}
