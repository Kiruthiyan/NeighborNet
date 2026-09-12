export function label(value: any): string {
  if (!value) return "—";
  if (typeof value === "object") {
    return formatLocation(value, "—");
  }
  return String(value)
    .split(/[_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export function formatLocation(loc: any, fallback = "—"): string {
  if (!loc) return fallback;
  if (typeof loc === "string") return loc.trim() || fallback;
  if (typeof loc === "object") {
    if (loc.address && typeof loc.address === "string") return loc.address;
    if (loc.destination && typeof loc.destination === "string") return loc.destination;
    if (loc.name && typeof loc.name === "string") return loc.name;
    if (loc.zone && typeof loc.zone === "string") return loc.zone;
    try {
      const parts = Object.values(loc).filter((v) => typeof v === "string" || typeof v === "number");
      if (parts.length > 0) return parts.join(", ");
    } catch {
      return fallback;
    }
  }
  return fallback;
}

