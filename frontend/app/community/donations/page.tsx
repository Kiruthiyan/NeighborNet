"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Package, Plus, X, AlertCircle, Clock, MapPin, CheckCircle2,
  Utensils, Droplets, Heart, Shirt, Wrench, Search, ArrowRight,
  Loader2, ChevronLeft, Gift, Tag, Hash, AlignLeft, Sparkles
} from "lucide-react";
import { Panel, Table, StatusBadge, EmptyState } from "../../../components/ui";
import { apiGet, request } from "../../../lib/api";

// ─── Catalog ──────────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: "FOOD", label: "Food & Meals", desc: "Cooked food, grains, canned goods",
    icon: Utensils, accent: "emerald",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-400",
    iconBg: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "WATER", label: "Water & Fluids", desc: "Bottled water, purification",
    icon: Droplets, accent: "sky",
    pill: "bg-sky-50 text-sky-700 border-sky-300 ring-sky-400",
    iconBg: "bg-sky-100 text-sky-700",
  },
  {
    id: "MEDICAL", label: "Medical & Hygiene", desc: "First aid, medicines, sanitisers",
    icon: Heart, accent: "rose",
    pill: "bg-rose-50 text-rose-700 border-rose-300 ring-rose-400",
    iconBg: "bg-rose-100 text-rose-700",
  },
  {
    id: "CLOTHING", label: "Clothing & Shelter", desc: "Blankets, clothes, rain gear",
    icon: Shirt, accent: "violet",
    pill: "bg-violet-50 text-violet-700 border-violet-300 ring-violet-400",
    iconBg: "bg-violet-100 text-violet-700",
  },
  {
    id: "EQUIPMENT", label: "Equipment", desc: "Torches, generators, tarps",
    icon: Wrench, accent: "slate",
    pill: "bg-slate-100 text-slate-700 border-slate-300 ring-slate-400",
    iconBg: "bg-slate-200 text-slate-700",
  },
] as const;
type CategoryId = (typeof CATEGORIES)[number]["id"];

interface DItem { label: string; unit: string; icon: string; category: CategoryId; }
const ITEMS: DItem[] = [
  { label: "Cooked Meals",       unit: "Portions", icon: "🍱", category: "FOOD" },
  { label: "Rice & Grains",      unit: "Kg",       icon: "🌾", category: "FOOD" },
  { label: "Canned Goods",       unit: "Cans",     icon: "🥫", category: "FOOD" },
  { label: "Bread & Bakery",     unit: "Loaves",   icon: "🍞", category: "FOOD" },
  { label: "Baby Formula",       unit: "Tins",     icon: "🍼", category: "FOOD" },
  { label: "Dry Rations",        unit: "Packs",    icon: "📦", category: "FOOD" },
  { label: "Fresh Vegetables",   unit: "Kg",       icon: "🥦", category: "FOOD" },
  { label: "Drinking Water",     unit: "Bottles",  icon: "💧", category: "WATER" },
  { label: "Water Purification", unit: "Tablets",  icon: "🧪", category: "WATER" },
  { label: "Water Containers",   unit: "Units",    icon: "🪣", category: "WATER" },
  { label: "First Aid Kits",     unit: "Kits",     icon: "🩺", category: "MEDICAL" },
  { label: "Medicines",          unit: "Boxes",    icon: "💊", category: "MEDICAL" },
  { label: "Sanitary Pads",      unit: "Packs",    icon: "🧴", category: "MEDICAL" },
  { label: "Face Masks",         unit: "Boxes",    icon: "😷", category: "MEDICAL" },
  { label: "Hand Sanitizer",     unit: "Bottles",  icon: "🧼", category: "MEDICAL" },
  { label: "Diapers",            unit: "Packs",    icon: "👶", category: "MEDICAL" },
  { label: "Blankets",           unit: "Units",    icon: "🛏", category: "CLOTHING" },
  { label: "Clothing Bundle",    unit: "Bags",     icon: "👕", category: "CLOTHING" },
  { label: "Rain Ponchos",       unit: "Units",    icon: "🧥", category: "CLOTHING" },
  { label: "Rubber Boots",       unit: "Pairs",    icon: "🥾", category: "CLOTHING" },
  { label: "Flashlights",        unit: "Units",    icon: "🔦", category: "EQUIPMENT" },
  { label: "Batteries",          unit: "Packs",    icon: "🔋", category: "EQUIPMENT" },
  { label: "Tarpaulins",         unit: "Sheets",   icon: "🏕", category: "EQUIPMENT" },
  { label: "Generators",         unit: "Units",    icon: "⚡", category: "EQUIPMENT" },
  { label: "Sleeping Bags",      unit: "Units",    icon: "🛌", category: "EQUIPMENT" },
];

const EXPIRY_PRESETS = [
  { label: "6 hours",   hours: 6   },
  { label: "12 hours",  hours: 12  },
  { label: "24 hours",  hours: 24  },
  { label: "48 hours",  hours: 48  },
  { label: "1 week",    hours: 168 },
];

const UNITS = ["Portions","Kg","Packs","Bottles","Cans","Kits","Boxes","Units","Bags","Sheets","Loaves","Tins","Tablets","Pairs","Liters","Pieces"];

// ─── Section card wrapper ─────────────────────────────────────────────────────
function FormSection({ number, title, desc, icon: Icon, children }: {
  number: string; title: string; desc: string; icon: any; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold shrink-0">
          {number}
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={15} className="text-slate-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-slate-900 leading-tight">{title}</p>
            <p className="text-[11px] text-slate-500">{desc}</p>
          </div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CommunityDonationsPage() {
  const [resources, setResources]           = useState<any[]>([]);
  const [loading, setLoading]               = useState(true);
  const [view, setView]                     = useState<"list" | "add">("list");
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [success, setSuccess]               = useState(false);

  // form state
  const [category, setCategory]             = useState<CategoryId>("FOOD");
  const [itemQuery, setItemQuery]           = useState("");
  const [itemName, setItemName]             = useState("");
  const [unit, setUnit]                     = useState("Units");
  const [quantity, setQuantity]             = useState(10);
  const [expiryHours, setExpiryHours]       = useState(48);
  const [location, setLocation]             = useState("");
  const [notes, setNotes]                   = useState("");
  const [suggestOpen, setSuggestOpen]       = useState(false);

  const activeCat = CATEGORIES.find(c => c.id === category)!;

  const filteredItems = useMemo(() => {
    const q = itemQuery.trim().toLowerCase();
    return ITEMS.filter(d => d.category === category && (q === "" || d.label.toLowerCase().includes(q)));
  }, [itemQuery, category]);

  const handleItemSelect = useCallback((item: DItem) => {
    setItemName(item.label); setItemQuery(item.label); setUnit(item.unit); setSuggestOpen(false);
  }, []);

  const resetForm = () => {
    setCategory("FOOD"); setItemQuery(""); setItemName(""); setUnit("Units");
    setQuantity(10); setExpiryHours(48); setLocation(""); setNotes(""); setError(null); setSuccess(false);
  };

  const loadResources = async () => {
    setLoading(true);
    try { const data = await apiGet<any[]>("/resources", []); setResources(Array.isArray(data) ? data : []); }
    catch { /* silent */ }
    finally { setLoading(false); }
  };
  useEffect(() => { loadResources(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !location.trim()) return;
    setSubmitting(true); setError(null);
    try {
      await request("/resources", {
        method: "POST",
        body: JSON.stringify({ resource_type: category, quantity, pickup_location: location, expiry_hours: expiryHours, item_name: itemName, notes }),
      });
      setSuccess(true);
      await loadResources();
      setTimeout(() => { setView("list"); resetForm(); }, 1200);
    } catch (err: any) { setError(err?.message || "Failed to register donation"); }
    finally { setSubmitting(false); }
  };

  const canSubmit = itemName.trim().length > 0 && location.trim().length > 0 && !submitting;

  // ── LIST VIEW ───────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
              <Package size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Donations</h1>
              <p className="text-xs text-slate-500 mt-0.5">Share surplus resources with your community</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setView("add"); }}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-sm font-semibold shadow-sm shadow-emerald-600/20 transition-all"
          >
            <Plus size={16} /> Add Donation
          </button>
        </div>

        {/* Donations table */}
        <Panel title="Registered Donations" subtitle="Items you have contributed to community coordination">
          {loading ? (
            <div className="py-10 flex items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : resources.length === 0 ? (
            <EmptyState icon={Gift}>
              <p className="font-semibold text-slate-700">No donations yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Click <span className="font-semibold text-emerald-600">Add Donation</span> to contribute resources.
              </p>
            </EmptyState>
          ) : (
            <Table columns={["ID", "Item", "Category", "Qty", "Pickup Location", "Expires In", "Status"]}>
              {resources.map((item) => (
                <tr key={item.id || item.resource_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-xs text-slate-700">{item.id || item.resource_id || "RES-001"}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{item.item_name || item.resource_type}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{item.resource_type}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs font-semibold">{item.quantity} {item.unit || "units"}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1"><MapPin size={11} className="text-slate-400" />{item.pickup_location || "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Clock size={11} className="text-slate-400" />{item.expiry_hours ? `${item.expiry_hours}h` : "Flexible"}</span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={item.status || "AVAILABLE"} pulse={item.status === "MATCHED"} /></td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
      </div>
    );
  }

  // ── ADD VIEW ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">

      {/* Breadcrumb + title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <button
            onClick={() => { setView("list"); resetForm(); }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors mb-2"
          >
            <ChevronLeft size={14} /> Back to My Donations
          </button>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700"><Sparkles size={20} /></div>
            Register a Donation
          </h1>
          <p className="text-xs text-slate-500 mt-1 ml-11">Contribute resources to your community coordination network</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
          <span className={`h-2 w-2 rounded-full ${itemName ? "bg-emerald-500" : "bg-slate-300"}`} />
          Item
          <span className="text-slate-300">·</span>
          <span className={`h-2 w-2 rounded-full ${quantity > 0 ? "bg-emerald-500" : "bg-slate-300"}`} />
          Qty
          <span className="text-slate-300">·</span>
          <span className={`h-2 w-2 rounded-full ${location ? "bg-emerald-500" : "bg-slate-300"}`} />
          Location
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={16} className="shrink-0" /> Donation registered! Redirecting…
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Two-column grid on lg ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* LEFT COLUMN */}
          <div className="space-y-4">

            {/* Section 1: Category */}
            <FormSection number="1" title="Donation Category" desc="What type of resource are you sharing?" icon={Tag}>
              <div className="space-y-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const active = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => { setCategory(cat.id); setItemQuery(""); setItemName(""); setSuggestOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                        active
                          ? `${cat.pill} ring-1 shadow-sm`
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 ${active ? cat.iconBg : "bg-slate-100 text-slate-500"}`}>
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-tight">{cat.label}</p>
                        <p className={`text-[10px] mt-0.5 ${active ? "opacity-70" : "text-slate-400"}`}>{cat.desc}</p>
                      </div>
                      {active && <CheckCircle2 size={15} className="ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </FormSection>

            {/* Section 2: Item */}
            <FormSection number="2" title="Item Name" desc="Search or type the specific item you are donating" icon={Search}>
              <div className="relative">
                <div className="relative flex items-center">
                  <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={itemQuery}
                    onChange={(e) => { setItemQuery(e.target.value); setItemName(e.target.value); setSuggestOpen(true); }}
                    onFocus={() => setSuggestOpen(true)}
                    onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
                    placeholder={`Search ${activeCat.label.toLowerCase()} items…`}
                    className={`w-full rounded-xl border pl-9 pr-9 py-2.5 text-sm focus:outline-none transition-all ${
                      itemName
                        ? "border-emerald-400 bg-emerald-50/40 focus:border-emerald-500"
                        : "border-slate-300 bg-white focus:border-emerald-500"
                    }`}
                    required
                    autoComplete="off"
                  />
                  {itemName && (
                    <button
                      type="button"
                      onClick={() => { setItemQuery(""); setItemName(""); }}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                  {itemName && !suggestOpen && (
                    <CheckCircle2 size={14} className="absolute right-3 text-emerald-500" />
                  )}
                </div>

                {/* Suggestions dropdown */}
                {suggestOpen && filteredItems.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100">
                      {activeCat.label}
                    </div>
                    <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
                      {filteredItems.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onMouseDown={() => handleItemSelect(item)}
                          className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-emerald-50 transition-colors"
                        >
                          <span className="text-xl leading-none w-6 text-center">{item.icon}</span>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Suggested unit: {item.unit}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </FormSection>

          </div>{/* end left col */}

          {/* RIGHT COLUMN */}
          <div className="space-y-4">

            {/* Section 3: Quantity & Unit */}
            <FormSection number="3" title="Quantity & Unit" desc="How much are you able to donate?" icon={Hash}>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {/* Stepper */}
                  <div className="flex items-center rounded-xl border border-slate-300 overflow-hidden">
                    <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 5))}
                      className="px-3 py-2.5 text-slate-500 hover:bg-slate-100 font-bold text-sm border-r border-slate-200 transition-colors">−5</button>
                    <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="px-3 py-2.5 text-slate-500 hover:bg-slate-100 font-bold text-sm border-r border-slate-200 transition-colors">−</button>
                    <input
                      type="number" min="1" value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-20 text-center py-2.5 text-base font-bold focus:outline-none bg-white"
                      required
                    />
                    <button type="button" onClick={() => setQuantity(q => q + 1)}
                      className="px-3 py-2.5 text-slate-500 hover:bg-slate-100 font-bold text-sm border-l border-slate-200 transition-colors">+</button>
                    <button type="button" onClick={() => setQuantity(q => q + 5)}
                      className="px-3 py-2.5 text-slate-500 hover:bg-slate-100 font-bold text-sm border-l border-slate-200 transition-colors">+5</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Unit of measure</label>
                  <select value={unit} onChange={(e) => setUnit(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold focus:border-emerald-500 focus:outline-none">
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <p className="text-xs text-slate-400">
                  Offering <span className="font-bold text-slate-700">{quantity} {unit}</span>
                  {itemName ? ` of ${itemName}` : ""}
                </p>
              </div>
            </FormSection>

            {/* Section 4: Pickup Location */}
            <FormSection number="4" title="Pickup Location" desc="Where can volunteers collect this donation?" icon={MapPin}>
              <div className="relative flex items-center">
                <MapPin size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. 12 Station Road, Zone B, Rathmalana…"
                  required
                  className={`w-full rounded-xl border pl-9 py-2.5 text-sm focus:outline-none transition-all ${
                    location
                      ? "border-emerald-400 bg-emerald-50/40 focus:border-emerald-500"
                      : "border-slate-300 bg-white focus:border-emerald-500"
                  }`}
                />
              </div>
            </FormSection>

            {/* Section 5: Availability Window */}
            <FormSection number="5" title="Availability Window" desc="How long will this donation be available for pickup?" icon={Clock}>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {EXPIRY_PRESETS.map((p) => (
                    <button
                      key={p.hours}
                      type="button"
                      onClick={() => setExpiryHours(p.hours)}
                      className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        expiryHours === p.hours
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-400"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-500 shrink-0">Custom (hours):</label>
                  <input
                    type="number" min="1" max="720" value={expiryHours}
                    onChange={(e) => setExpiryHours(Number(e.target.value))}
                    className="w-20 rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-bold text-center focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">= {expiryHours >= 168 ? `${Math.round(expiryHours/168)} week(s)` : expiryHours >= 24 ? `${Math.round(expiryHours/24)} day(s)` : `${expiryHours}h`}</span>
                </div>
              </div>
            </FormSection>

            {/* Section 6: Notes */}
            <FormSection number="6" title="Additional Notes" desc="Any special instructions, conditions, or contact details" icon={AlignLeft}>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Items are packed and ready. Call before collecting. Keep refrigerated…"
                rows={3}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none resize-none placeholder:text-slate-400"
              />
            </FormSection>

          </div>{/* end right col */}
        </div>

        {/* ── Action bar ── */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white shadow-sm px-6 py-4">
          <div className="text-xs text-slate-500">
            {canSubmit
              ? <span className="flex items-center gap-1.5 text-emerald-700 font-semibold"><CheckCircle2 size={14} /> All required fields complete</span>
              : <span>Fill in <span className="font-semibold text-slate-700">item name</span> and <span className="font-semibold text-slate-700">pickup location</span> to continue</span>}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { setView("list"); resetForm(); }}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-2.5 text-sm font-semibold shadow-sm shadow-emerald-600/20 transition-all"
            >
              {submitting
                ? <><Loader2 size={15} className="animate-spin" /> Registering…</>
                : <>Register Donation <ArrowRight size={15} /></>}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
