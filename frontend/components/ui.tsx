import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function StatCard({
  title,
  value,
  icon: Icon
}: {
  title: string;
  value: string | number;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between text-slate-500">
        <span className="text-xs font-medium uppercase">{title}</span>
        {Icon && <Icon size={18} />}
      </div>
      <div className="text-2xl font-semibold">{String(value)}</div>
    </div>
  );
}

export function Panel({
  title,
  icon: Icon,
  iconClassName,
  children,
  action
}: {
  title: string;
  icon?: LucideIcon;
  iconClassName?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          {action}
          {Icon && <Icon className={iconClassName ?? "text-slate-400"} size={20} />}
        </div>
      </div>
      {children}
    </div>
  );
}

const badgeTones: Record<string, string> = {
  green: "bg-field text-leaf",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-danger",
  neutral: "bg-slate-100 text-slate-600"
};

export function Badge({
  children,
  tone = "neutral"
}: {
  children: ReactNode;
  tone?: "green" | "amber" | "red" | "neutral";
}) {
  return (
    <span className={`rounded px-2 py-1 text-xs font-medium ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}

export function riskTone(risk: string | undefined | null): "green" | "amber" | "red" | "neutral" {
  if (risk === "green" || risk === "amber" || risk === "red") return risk;
  return "neutral";
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded border border-dashed border-slate-300 p-5 text-sm text-slate-500">
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
    <div className="overflow-x-auto rounded border border-slate-200 bg-white">
      <table className="w-full min-w-max text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
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
