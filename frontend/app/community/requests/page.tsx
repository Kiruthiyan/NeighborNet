"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import {
  HeartHandshake,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Clock,
  Users,
  Package,
  AlertTriangle,
  Eye,
  Edit3,
  Trash2,
  Search,
  Check,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ArrowRight,
  Info,
  Navigation,
  Activity,
  Flame,
  LayoutGrid,
  ListFilter,
  Droplets,
  Utensils,
  Sparkles,
  Tent,
  Medkit
} from "lucide-react";
import { StatusBadge } from "../../../components/ui";
import { useAuth } from "../../../lib/auth";
import LocationPicker, { LocationResult } from "../../../components/LocationPicker";

// Types
export type RequestMode = "NORMAL" | "DISASTER";
export type UrgencyLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RequestStatus =
  | "PENDING"
  | "VALIDATED"
  | "MATCHED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type RiskLevel = "GREEN" | "AMBER" | "RED";

export interface RequestItem {
  id: string;
  request_id: string;
  mode: RequestMode;
  disaster_name?: string;
  disaster_id?: string;
  type: string;
  resource_name: string;
  quantity: number;
  unit: string;
  affected_location: string;
  address_or_landmark: string;
  zone: string;
  latitude: number;
  longitude: number;
  is_in_disaster_zone: boolean;
  reason: string;
  people_affected: number;
  urgency: UrgencyLevel;
  needed_by_date: string;
  needed_by_time: string;
  status: RequestStatus;
  risk_classification: RiskLevel;
  created_at: string;
  matched_resource?: string;
  matched_donor?: string;
  assigned_volunteer?: string;
  notifications?: {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    type: "info" | "success" | "warning" | "error";
  }[];
}

// Initial Mock Requests to immediately showcase all features & the prompt's REQ-1042 example
const INITIAL_REQUESTS: RequestItem[] = [
  {
    id: "req-1042",
    request_id: "REQ-1042",
    mode: "DISASTER",
    disaster_name: "Flood – Zone B",
    disaster_id: "disaster_1",
    type: "Drinking Water",
    resource_name: "Drinking Water",
    quantity: 100,
    unit: "Bottles",
    affected_location: "Rathmalana, Zone B",
    address_or_landmark: "Station Road, Near Community Relief Shelter #3",
    zone: "Zone B",
    latitude: 6.8213,
    longitude: 79.8862,
    is_in_disaster_zone: true,
    reason: "Flooding has contaminated local water mains and community kitchen is flooded.",
    people_affected: 45,
    urgency: "CRITICAL",
    needed_by_date: "Today",
    needed_by_time: "6:00 PM",
    status: "PENDING",
    risk_classification: "GREEN",
    created_at: "2026-09-09T14:30:00Z",
    matched_resource: "100 bottles drinking water",
    matched_donor: "Community Food Bank",
    assigned_volunteer: "Awaiting assignment",
    notifications: [
      {
        id: "n-1",
        title: "Request Created & Verified",
        message: "Deterministic checks passed. Service area verified within Zone B.",
        timestamp: "2:30 PM",
        type: "success"
      },
      {
        id: "n-2",
        title: "Deterministic Safety Classification",
        message: "RiskClassifier assigned status GREEN. Automated matching pipeline activated.",
        timestamp: "2:31 PM",
        type: "info"
      },
      {
        id: "n-3",
        title: "PlanningEngine Matching Active",
        message: "Matching against 100 bottles Drinking Water from Community Food Bank.",
        timestamp: "2:35 PM",
        type: "info"
      }
    ]
  },
  {
    id: "req-1038",
    request_id: "REQ-1038",
    mode: "NORMAL",
    type: "Food",
    resource_name: "Hot Cooked Meals",
    quantity: 35,
    unit: "Packs",
    affected_location: "Moratuwa, Zone B",
    address_or_landmark: "24 Ferry Street, Golden Age Elder Care",
    zone: "Zone B",
    latitude: 6.773,
    longitude: 79.8816,
    is_in_disaster_zone: false,
    reason: "Kitchen renovation in progress; midday meals requested for elderly residents.",
    people_affected: 35,
    urgency: "MEDIUM",
    needed_by_date: "Tomorrow",
    needed_by_time: "12:00 PM",
    status: "IN_PROGRESS",
    risk_classification: "GREEN",
    created_at: "2026-09-08T09:15:00Z",
    matched_resource: "35 Fresh Nutritional Lunch Packs",
    matched_donor: "St. Peter's Community Kitchen",
    assigned_volunteer: "Kasun Silva (Volunteer #V-204)",
    notifications: [
      {
        id: "n-10",
        title: "Volunteer Assigned",
        message: "Kasun Silva accepted task assignment. Pickup scheduled from St. Peter's Kitchen.",
        timestamp: "Yesterday, 3:00 PM",
        type: "success"
      },
      {
        id: "n-11",
        title: "Task In Progress",
        message: "Volunteer en route for meal pickup.",
        timestamp: "Today, 10:45 AM",
        type: "info"
      }
    ]
  },
  {
    id: "req-1029",
    request_id: "REQ-1029",
    mode: "DISASTER",
    disaster_name: "Flood – Zone B",
    disaster_id: "disaster_1",
    type: "Essential Supplies",
    resource_name: "Hygiene & Sanitation Kits",
    quantity: 20,
    unit: "Kits",
    affected_location: "Dehiwala, Zone A",
    address_or_landmark: "Dharmapala Road Community Center",
    zone: "Zone A",
    latitude: 6.8515,
    longitude: 79.8659,
    is_in_disaster_zone: true,
    reason: "Families evacuated from low-lying riverbank homes without basic toiletries.",
    people_affected: 20,
    urgency: "HIGH",
    needed_by_date: "Today",
    needed_by_time: "8:00 PM",
    status: "ASSIGNED",
    risk_classification: "GREEN",
    created_at: "2026-09-09T08:20:00Z",
    matched_resource: "20 Disaster Relief Hygiene Packs",
    matched_donor: "Red Cross Chapter",
    assigned_volunteer: "Niroja Kumar (Driver with Cargo Van)",
    notifications: [
      {
        id: "n-20",
        title: "Volunteer Assigned",
        message: "Niroja Kumar has taken charge of this distribution batch.",
        timestamp: "11:15 AM",
        type: "success"
      }
    ]
  },
  {
    id: "req-1015",
    request_id: "REQ-1015",
    mode: "NORMAL",
    type: "Food",
    resource_name: "Dry Rations & Baby Formula",
    quantity: 12,
    unit: "Boxes",
    affected_location: "Wellawatte, Zone A",
    address_or_landmark: "Manning Place, Near Beach Road",
    zone: "Zone A",
    latitude: 6.8781,
    longitude: 79.8611,
    is_in_disaster_zone: false,
    reason: "Neighborhood single parent cooperative dry food assistance.",
    people_affected: 18,
    urgency: "LOW",
    needed_by_date: "Sep 12, 2026",
    needed_by_time: "5:00 PM",
    status: "COMPLETED",
    risk_classification: "GREEN",
    created_at: "2026-09-06T11:00:00Z",
    matched_resource: "12 Dry Provisions Care Baskets",
    matched_donor: "Mercy Food Drive",
    assigned_volunteer: "Dilshan Fernando",
    notifications: [
      {
        id: "n-30",
        title: "Delivery Completed Successfully",
        message: "All 12 care baskets delivered and verified by recipient cooperative.",
        timestamp: "Sep 7, 4:20 PM",
        type: "success"
      }
    ]
  }
];

// Active Disasters for Disaster Mode
const ACTIVE_DISASTERS = [
  {
    id: "disaster_1",
    name: "Flood – Zone B",
    zones: ["Zone B", "Zone A"],
    description: "Canal overflow and flash flooding affecting Rathmalana, Moratuwa, and lower Dehiwala.",
    neededRequests: [
      {
        title: "Drinking Water",
        category: "Drinking Water",
        resource: "Drinking Water",
        qty: 100,
        unit: "Bottles",
        people: 45,
        urgency: "CRITICAL" as UrgencyLevel,
        reason: "Flash flooding contaminated ground water; drinking water urgently required for stranded households.",
        location: "Rathmalana, Zone B",
        landmark: "Station Road, Near Relief Center",
        zone: "Zone B"
      },
      {
        title: "Emergency Cooked Meals",
        category: "Food",
        resource: "Hot Meals / Rice & Curry",
        qty: 50,
        unit: "Packs",
        people: 50,
        urgency: "HIGH" as UrgencyLevel,
        reason: "Local community kitchen flooded and non-operational; immediate midday meals needed.",
        location: "Moratuwa, Zone B",
        landmark: "Bridge Road Evacuation Hall",
        zone: "Zone B"
      },
      {
        title: "Hygiene & Dry Kits",
        category: "Essential Supplies",
        resource: "Hygiene & Dry Clothing Kits",
        qty: 25,
        unit: "Kits",
        people: 25,
        urgency: "HIGH" as UrgencyLevel,
        reason: "Displaced families need soap, dry clothes, and sanitation essentials.",
        location: "Dehiwala, Zone A",
        landmark: "Dharmapala Road Shelter",
        zone: "Zone A"
      },
      {
        title: "Emergency Tarpaulins",
        category: "Shelter",
        resource: "Waterproof Tarpaulins",
        qty: 15,
        unit: "Tarps",
        people: 30,
        urgency: "CRITICAL" as UrgencyLevel,
        reason: "Roof breaches due to heavy rain in temporary shelter area.",
        location: "Rathmalana, Zone B",
        landmark: "South Embankment Community Camp",
        zone: "Zone B"
      }
    ]
  }
];

// Zone coordinates
const ZONE_PRESETS: Record<string, { lat: number; lng: number; defaultLocation: string; inDisaster: boolean }> = {
  "Zone A": { lat: 6.8781, lng: 79.8611, defaultLocation: "Colombo South / Dehiwala", inDisaster: true },
  "Zone B": { lat: 6.8213, lng: 79.8862, defaultLocation: "Rathmalana, Zone B", inDisaster: true },
  "Zone C": { lat: 6.7915, lng: 79.8821, defaultLocation: "Coastal Panadura / Lunawa", inDisaster: false },
  "Zone D": { lat: 6.8395, lng: 79.9142, defaultLocation: "Piliyandala / Inland East", inDisaster: false }
};

// Item autocomplete catalogue
const ITEM_SUGGESTIONS: { label: string; unit: string; category: string; icon: string }[] = [
  // Water
  { label: "Drinking Water", unit: "Bottles", category: "Water", icon: "💧" },
  { label: "Water Purification Tablets", unit: "Packs", category: "Water", icon: "💧" },
  { label: "Water Cans (20L)", unit: "Units", category: "Water", icon: "💧" },
  // Food
  { label: "Hot Cooked Meals", unit: "Meals", category: "Food", icon: "🍱" },
  { label: "Dry Rations", unit: "Boxes", category: "Food", icon: "🥫" },
  { label: "Baby Formula", unit: "Boxes", category: "Food", icon: "🍼" },
  { label: "Bread & Biscuits", unit: "Packs", category: "Food", icon: "🍞" },
  { label: "Rice (5kg)", unit: "Kg", category: "Food", icon: "🍚" },
  { label: "Infant / Toddler Food", unit: "Packs", category: "Food", icon: "👶" },
  { label: "Diabetic-Friendly Meals", unit: "Meals", category: "Food", icon: "🩺" },
  // Medical
  { label: "First Aid Kits", unit: "Kits", category: "Medical", icon: "🏥" },
  { label: "Prescription Medicines", unit: "Packs", category: "Medical", icon: "💊" },
  { label: "Bandages & Dressings", unit: "Packs", category: "Medical", icon: "🩹" },
  { label: "Insulin / Syringes", unit: "Units", category: "Medical", icon: "💉" },
  { label: "Oxygen Cylinders", unit: "Units", category: "Medical", icon: "🫁" },
  { label: "Wheelchair / Mobility Aid", unit: "Units", category: "Medical", icon: "♿" },
  // Shelter
  { label: "Waterproof Tarpaulins", unit: "Tarps", category: "Shelter", icon: "⛺" },
  { label: "Emergency Tents", unit: "Units", category: "Shelter", icon: "⛺" },
  { label: "Sleeping Bags", unit: "Units", category: "Shelter", icon: "🛌" },
  { label: "Blankets", unit: "Units", category: "Shelter", icon: "🛏️" },
  { label: "Mattresses", unit: "Units", category: "Shelter", icon: "🛏️" },
  // Sanitation & Hygiene
  { label: "Hygiene & Sanitation Kits", unit: "Kits", category: "Sanitation", icon: "🧴" },
  { label: "Soap & Hand Sanitizer", unit: "Packs", category: "Sanitation", icon: "🧼" },
  { label: "Feminine Hygiene Products", unit: "Packs", category: "Sanitation", icon: "🧴" },
  { label: "Diapers (Baby)", unit: "Packs", category: "Sanitation", icon: "👶" },
  { label: "Portable Toilets", unit: "Units", category: "Sanitation", icon: "🚽" },
  { label: "Disinfectant & Bleach", unit: "Packs", category: "Sanitation", icon: "🧹" },
  // Clothing
  { label: "Dry Clothing", unit: "Packs", category: "Clothing", icon: "👕" },
  { label: "Rain Ponchos", unit: "Units", category: "Clothing", icon: "🌧️" },
  { label: "Children's Clothing", unit: "Packs", category: "Clothing", icon: "👶" },
  { label: "Footwear / Rubber Slippers", unit: "Packs", category: "Clothing", icon: "👟" },
  // Power & Safety
  { label: "Torch / Flashlights", unit: "Units", category: "Safety", icon: "🔦" },
  { label: "Candles", unit: "Packs", category: "Safety", icon: "🕯️" },
  { label: "Batteries", unit: "Packs", category: "Safety", icon: "🔋" },
  { label: "Power Banks", unit: "Units", category: "Safety", icon: "🔋" },
  { label: "Life Jackets", unit: "Units", category: "Safety", icon: "🛟" },
  // General
  { label: "Cash / Grocery Vouchers", unit: "Units", category: "General", icon: "💵" },
  { label: "Volunteer Help", unit: "Units", category: "General", icon: "🙋" },
  { label: "Transport / Evacuation", unit: "Units", category: "General", icon: "🚐" },
];

export default function CommunityRequestsPage() {
  const { user } = useAuth();

  // Requests state
  const [requestsList, setRequestsList] = useState<RequestItem[]>(INITIAL_REQUESTS);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState<"ALL" | "NORMAL" | "DISASTER">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"CARDS" | "TABLE">("CARDS");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDetailRequest, setSelectedDetailRequest] = useState<RequestItem | null>(null);
  const [editingRequest, setEditingRequest] = useState<RequestItem | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [latestCreatedId, setLatestCreatedId] = useState<string>("");

  // ==========================================
  // Streamlined Form State (Only Needed Fields)
  // ==========================================
  const [formMode, setFormMode] = useState<RequestMode>("DISASTER");
  const [formDisasterId, setFormDisasterId] = useState("disaster_1");
  const [formType, setFormType] = useState("Drinking Water");
  const [formResourceName, setFormResourceName] = useState("Drinking Water");
  const [formQuantity, setFormQuantity] = useState<number>(100);
  const [formUnit, setFormUnit] = useState("Bottles");
  const [formLocation, setFormLocation] = useState<LocationResult | null>(null);
  const [formZone, setFormZone] = useState("Zone B");
  const [formReason, setFormReason] = useState("");
  const [formPeopleCount, setFormPeopleCount] = useState<number | "">("");
  const [formUrgency, setFormUrgency] = useState<UrgencyLevel>("CRITICAL");

  // Item autocomplete state
  const [itemQuery, setItemQuery] = useState("Drinking Water");
  const [itemSuggestOpen, setItemSuggestOpen] = useState(false);
  const itemInputRef = useRef<HTMLInputElement>(null);
  const itemDropdownRef = useRef<HTMLDivElement>(null);

  const filteredItems = useMemo(() => {
    const q = itemQuery.toLowerCase().trim();
    if (!q) return ITEM_SUGGESTIONS.slice(0, 8);
    return ITEM_SUGGESTIONS.filter((s) =>
      s.label.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [itemQuery]);

  const handleItemSelect = useCallback((item: typeof ITEM_SUGGESTIONS[0]) => {
    setFormResourceName(item.label);
    setFormType(item.category);
    setFormUnit(item.unit);
    setItemQuery(item.label);
    setItemSuggestOpen(false);
    setValidationDone(false);
  }, []);

  const handleItemQueryChange = useCallback((val: string) => {
    setItemQuery(val);
    setFormResourceName(val);
    setItemSuggestOpen(true);
    setValidationDone(false);
  }, []);

  // Validation State
  const [validationDone, setValidationDone] = useState(false);
  const [validationOk, setValidationOk] = useState(true);
  const [safetyRisk, setSafetyRisk] = useState<RiskLevel>("GREEN");
  const [safetyExplanation, setSafetyExplanation] = useState("Request can proceed automatically.");

  // Check if location is in disaster zone
  const isLocationInActiveDisasterZone = useMemo(() => {
    return formZone === "Zone B" || (formZone === "Zone A" && formMode === "DISASTER");
  }, [formZone, formMode]);

  // Derive zone from picked location lat/lng
  const deriveZoneFromLocation = (loc: LocationResult): string => {
    // Simple bounding-box heuristic for demo zones
    if (loc.lat <= 6.83) return "Zone B";
    if (loc.lat <= 6.87) return "Zone A";
    if (loc.lng <= 79.88) return "Zone C";
    return "Zone D";
  };

  // Quick-fill helper for needed disaster requests
  const handleQuickFill = (needed: typeof ACTIVE_DISASTERS[0]["neededRequests"][0]) => {
    setFormType(needed.category);
    setFormResourceName(needed.resource);
    setItemQuery(needed.resource);
    setFormQuantity(needed.qty);
    setFormUnit(needed.unit);
    setFormPeopleCount(needed.people);
    setFormUrgency(needed.urgency);
    setFormReason(needed.reason);
    // Set location from preset
    const preset = ZONE_PRESETS[needed.zone];
    if (preset) {
      setFormLocation({
        address: `${needed.landmark}, ${needed.location}`,
        lat: preset.lat,
        lng: preset.lng,
        verified: false,
      });
      setFormZone(needed.zone);
    }
    setValidationDone(false);
  };

  const handleZoneChange = (zone: string) => {
    setFormZone(zone);
    setValidationDone(false);
  };

  // Deterministic Validation & RiskClassifier
  const runValidation = () => {
    const validItem = Boolean(formResourceName.trim());
    const validQty = Number(formQuantity) > 0;
    const validLoc = Boolean(formLocation);

    const pass = validItem && validQty && validLoc;
    setValidationOk(pass);
    setValidationDone(true);

    // Deterministic RiskClassifier
    if (!pass) {
      setSafetyRisk("AMBER");
      setSafetyExplanation("Please fill in the required fields before submitting.");
    } else if (formQuantity > 800) {
      setSafetyRisk("AMBER");
      setSafetyExplanation("High-volume request requires coordinator review.");
    } else {
      setSafetyRisk("GREEN");
      setSafetyExplanation("Request can proceed automatically through PlanningEngine & VolunteerMatcher.");
    }
  };

  // Submit Request
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runValidation();

    const validItem = Boolean(formResourceName.trim());
    const validQty = Number(formQuantity) > 0;
    if (!validItem || !validQty || !formLocation) return;

    const zone = deriveZoneFromLocation(formLocation);
    const newReqId = `REQ-${Math.floor(1000 + Math.random() * 9000)}`;
    // Infer needed_by_date from urgency
    const urgencyToDate: Record<UrgencyLevel, string> = {
      CRITICAL: "Today (ASAP)",
      HIGH: "Today",
      MEDIUM: "Today",
      LOW: "This week",
    };

    const newRequest: RequestItem = {
      id: `req-${Date.now()}`,
      request_id: newReqId,
      mode: formMode,
      disaster_name: formMode === "DISASTER" ? "Flood – Zone B" : undefined,
      disaster_id: formMode === "DISASTER" ? formDisasterId : undefined,
      type: formType,
      resource_name: formResourceName,
      quantity: Number(formQuantity),
      unit: formUnit,
      affected_location: formLocation.address,
      address_or_landmark: formLocation.address,
      zone,
      latitude: formLocation.lat,
      longitude: formLocation.lng,
      is_in_disaster_zone: zone === "Zone A" || zone === "Zone B",
      reason: formReason || `${formResourceName} needed at ${formLocation.address}.`,
      people_affected: formPeopleCount !== "" ? Number(formPeopleCount) : 0,
      urgency: formUrgency,
      needed_by_date: urgencyToDate[formUrgency],
      needed_by_time: formUrgency === "CRITICAL" ? "ASAP" : "",
      status: "PENDING",
      risk_classification: safetyRisk,
      created_at: new Date().toISOString(),
      matched_resource: `${formQuantity} ${formUnit} of ${formResourceName}`,
      matched_donor: "Community Food Bank / Local Depot",
      assigned_volunteer: "Awaiting assignment",
      notifications: [
        {
          id: `n-${Date.now()}-1`,
          title: "Request Created & Validated",
          message: "Passed deterministic checks. Service area verified.",
          timestamp: "Just now",
          type: "success"
        },
        {
          id: `n-${Date.now()}-2`,
          title: `RiskClassifier: ${safetyRisk}`,
          message: safetyExplanation,
          timestamp: "Just now",
          type: "info"
        },
        {
          id: `n-${Date.now()}-3`,
          title: "PlanningEngine Matching Active",
          message: "Searching compatible resources and nearest volunteer responders.",
          timestamp: "Just now",
          type: "info"
        }
      ]
    };

    setRequestsList([newRequest, ...requestsList]);
    setLatestCreatedId(newReqId);
    setShowCreateModal(false);
    setShowConfirmation(true);
  };

  const handleCancelRequest = (reqId: string) => {
    if (!confirm("Are you sure you want to cancel this assistance request?")) return;
    setRequestsList((prev) =>
      prev.map((r) => (r.request_id === reqId || r.id === reqId ? { ...r, status: "CANCELLED" } : r))
    );
    if (selectedDetailRequest?.request_id === reqId || selectedDetailRequest?.id === reqId) {
      setSelectedDetailRequest((prev) => (prev ? { ...prev, status: "CANCELLED" } : null));
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;
    setRequestsList((prev) =>
      prev.map((r) => (r.id === editingRequest.id ? editingRequest : r))
    );
    setEditingRequest(null);
  };

  // Summary Counts
  const summaryCounts = useMemo(() => {
    const active = requestsList.filter((r) => !["COMPLETED", "CANCELLED"].includes(r.status)).length;
    const pending = requestsList.filter((r) => r.status === "PENDING").length;
    const inProgress = requestsList.filter((r) => ["ASSIGNED", "IN_PROGRESS"].includes(r.status)).length;
    const completed = requestsList.filter((r) => r.status === "COMPLETED").length;
    return { active, pending, inProgress, completed };
  }, [requestsList]);

  // Filtered list
  const filteredRequests = useMemo(() => {
    return requestsList.filter((req) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = req.request_id.toLowerCase().includes(q);
        const matchRes = req.resource_name.toLowerCase().includes(q);
        const matchLoc = req.affected_location.toLowerCase().includes(q);
        const matchDis = req.disaster_name?.toLowerCase().includes(q);
        if (!matchId && !matchRes && !matchLoc && !matchDis) return false;
      }
      if (modeFilter !== "ALL" && req.mode !== modeFilter) return false;
      if (statusFilter !== "ALL" && req.status !== statusFilter) return false;
      if (urgencyFilter !== "ALL" && req.urgency !== urgencyFilter) return false;
      return true;
    });
  }, [requestsList, searchQuery, modeFilter, statusFilter, urgencyFilter]);

  const renderUrgencyBadge = (urgency: UrgencyLevel) => {
    switch (urgency) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
            🔴 Critical
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            🟠 High
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            🟡 Medium
          </span>
        );
      case "LOW":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            🟢 Low
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/20">
              <HeartHandshake size={26} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                My Requests
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
                Create and track requests for food, essential supplies, and community assistance.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setValidationDone(false);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] self-start sm:self-auto"
        >
          <Plus size={18} strokeWidth={2.5} />
          Create Request
        </button>
      </div>

      {/* 2. Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Active Requests
              </p>
              <div className="mt-1.5 text-3xl font-extrabold tracking-tight text-slate-900">
                {summaryCounts.active}
              </div>
              <p className="mt-1 text-xs text-slate-500">Currently active in system</p>
            </div>
            <div className="rounded-xl border border-teal-100 bg-teal-50 p-2 text-teal-600">
              <Package size={20} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Pending Matching
              </p>
              <div className="mt-1.5 text-3xl font-extrabold tracking-tight text-amber-600">
                {summaryCounts.pending}
              </div>
              <p className="mt-1 text-xs text-slate-500">Evaluating inventory & depots</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-2 text-amber-600">
              <Clock size={20} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                In Progress
              </p>
              <div className="mt-1.5 text-3xl font-extrabold tracking-tight text-sky-600">
                {summaryCounts.inProgress}
              </div>
              <p className="mt-1 text-xs text-slate-500">Volunteers dispatched</p>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50 p-2 text-sky-600">
              <Navigation size={20} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Completed
              </p>
              <div className="mt-1.5 text-3xl font-extrabold tracking-tight text-emerald-600">
                {summaryCounts.completed}
              </div>
              <p className="mt-1 text-xs text-slate-500">Successfully fulfilled</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2 text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filters & Search */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search by ID, resource, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 pl-9 pr-4 py-2 text-xs font-medium placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              <button
                onClick={() => setModeFilter("ALL")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  modeFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All Modes
              </button>
              <button
                onClick={() => setModeFilter("NORMAL")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  modeFilter === "NORMAL" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => setModeFilter("DISASTER")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  modeFilter === "DISASTER" ? "bg-white text-rose-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Disaster
              </button>
            </div>

            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Urgencies</option>
              <option value="CRITICAL">🔴 Critical</option>
              <option value="HIGH">🟠 High</option>
              <option value="MEDIUM">🟡 Medium</option>
              <option value="LOW">🟢 Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Matching</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs ml-auto">
              <button
                onClick={() => setViewMode("CARDS")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "CARDS" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Card Grid View"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode("TABLE")}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === "TABLE" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
                title="Table View"
              >
                <ListFilter size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Requests List: Cards View */}
      {filteredRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <HeartHandshake size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-800">No requests match your filter</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or create a new community assistance request.
          </p>
        </div>
      ) : viewMode === "CARDS" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((req) => (
            <div
              key={req.id || req.request_id}
              className="group relative rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-200 flex flex-col justify-between"
            >
              <div>
                {/* Card Top Row */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                      #{req.request_id}
                    </span>
                    {req.mode === "DISASTER" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                        <Flame size={12} className="text-rose-600" />
                        {req.disaster_name || "Disaster Mode"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                        Normal Mode
                      </span>
                    )}
                  </div>
                  <div>{renderUrgencyBadge(req.urgency)}</div>
                </div>

                {/* Resource Title & Quantity */}
                <div className="mb-3">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {req.resource_name}
                    </h3>
                    <span className="text-xs font-extrabold text-slate-800 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                      {req.quantity} {req.unit} · {req.people_affected} people
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{req.reason}</p>
                </div>

                {/* Location */}
                <div className="mb-3 rounded-xl bg-slate-50/90 border border-slate-200/60 p-2.5 text-xs text-slate-600 flex items-start gap-2">
                  <MapPin size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-800">{req.affected_location}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{req.address_or_landmark}</div>
                    {req.is_in_disaster_zone && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-rose-600">
                        <AlertTriangle size={11} /> Inside Active Disaster Zone
                      </span>
                    )}
                  </div>
                </div>

                {/* Needed By & Status */}
                <div className="flex items-center justify-between text-xs pt-1 mb-2">
                  <div className="flex items-center gap-1 text-slate-500">
                    <Clock size={13} className="text-slate-400" />
                    <span>Needed by:</span>
                    <strong className="text-slate-700">
                      {req.needed_by_date}, {req.needed_by_time}
                    </strong>
                  </div>
                  <div>
                    <StatusBadge
                      status={
                        req.status === "PENDING"
                          ? "Pending Matching"
                          : req.status === "ASSIGNED"
                          ? "Assigned"
                          : req.status === "IN_PROGRESS"
                          ? "In Progress"
                          : req.status === "COMPLETED"
                          ? "Completed"
                          : req.status
                      }
                      pulse={req.status === "PENDING" || req.status === "IN_PROGRESS"}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-2">
                <button
                  onClick={() => setSelectedDetailRequest(req)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  <Eye size={13} /> View Details
                </button>

                <div className="flex items-center gap-2">
                  {req.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => setEditingRequest({ ...req })}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-slate-100"
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                      <button
                        onClick={() => handleCancelRequest(req.request_id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-md hover:bg-rose-50"
                      >
                        <Trash2 size={12} /> Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Responsive Table View */
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <table className="w-full min-w-max text-left text-xs">
            <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="px-4 py-3">Request ID</th>
                <th className="px-4 py-3">Type & Mode</th>
                <th className="px-4 py-3">Resource & Quantity</th>
                <th className="px-4 py-3">People</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Urgency</th>
                <th className="px-4 py-3">Needed By</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map((req) => (
                <tr key={req.id || req.request_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">#{req.request_id}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{req.type}</div>
                    <div className="text-[10px] text-slate-500">
                      {req.mode === "DISASTER" ? req.disaster_name || "Disaster Mode" : "Normal Mode"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-slate-900">{req.resource_name}</span>
                    <div className="text-slate-500 text-[11px]">
                      {req.quantity} {req.unit}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{req.people_affected} people</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{req.affected_location}</div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                      {req.address_or_landmark}
                    </div>
                  </td>
                  <td className="px-4 py-3">{renderUrgencyBadge(req.urgency)}</td>
                  <td className="px-4 py-3 text-slate-600 font-medium">
                    {req.needed_by_date}, {req.needed_by_time}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={
                        req.status === "PENDING"
                          ? "Pending Matching"
                          : req.status === "ASSIGNED"
                          ? "Assigned"
                          : req.status === "IN_PROGRESS"
                          ? "In Progress"
                          : req.status === "COMPLETED"
                          ? "Completed"
                          : req.status
                      }
                      pulse={req.status === "PENDING" || req.status === "IN_PROGRESS"}
                    />
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => setSelectedDetailRequest(req)}
                      className="text-emerald-700 hover:text-emerald-800 font-bold text-xs hover:underline"
                    >
                      View
                    </button>
                    {req.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => setEditingRequest({ ...req })}
                          className="text-slate-600 hover:text-slate-900 font-semibold text-xs hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleCancelRequest(req.request_id)}
                          className="text-rose-600 hover:text-rose-700 font-semibold text-xs hover:underline"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. STREAMLINED CREATE REQUEST MODAL (NO UNWANTED FLUFF - ONLY NEEDED FIELDS) */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-hidden">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${formMode === "DISASTER" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                  <HeartHandshake size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Request Assistance</h3>
                  <p className="text-[11px] text-slate-500">Quick form — submit in under 30 seconds</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X size={17} />
              </button>
            </div>

            {/* Modal Body — Lean 3-Step Emergency Form */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 text-xs">
              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-4">

              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setFormMode("NORMAL"); setFormUrgency("MEDIUM"); setValidationDone(false); }}
                  className={`py-2.5 px-3 rounded-xl border text-left font-bold transition-all ${
                    formMode === "NORMAL"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>Normal Request</span>
                    {formMode === "NORMAL" && <CheckCircle2 size={15} className="text-emerald-600" />}
                  </div>
                  <p className="text-[10px] font-normal text-slate-400 mt-0.5">Everyday community help</p>
                </button>
                <button
                  type="button"
                  onClick={() => { setFormMode("DISASTER"); setFormUrgency("CRITICAL"); setValidationDone(false); }}
                  className={`py-2.5 px-3 rounded-xl border text-left font-bold transition-all ${
                    formMode === "DISASTER"
                      ? "border-rose-600 bg-rose-50 text-rose-800 ring-1 ring-rose-500"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1"><Flame size={13} className="text-rose-600" /> Emergency</span>
                    {formMode === "DISASTER" && <CheckCircle2 size={15} className="text-rose-600" />}
                  </div>
                  <p className="text-[10px] font-normal text-slate-400 mt-0.5">Disaster / crisis situation</p>
                </button>
              </div>

              {/* 1-Click Disaster Quick Fill */}
              {formMode === "DISASTER" && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-rose-600" />
                      Active: Flood – Zone B
                    </span>
                    <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">Tap to auto-fill</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ACTIVE_DISASTERS[0].neededRequests.map((needed, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleQuickFill(needed)}
                        className="text-left p-2 rounded-lg border border-rose-200/90 bg-white hover:border-rose-400 hover:shadow-xs transition-all"
                      >
                        <div className="font-bold text-[11px] text-slate-900 truncate">{needed.title}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{needed.qty} {needed.unit} · {needed.people} people</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 1: What do you need? */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">1 — What do you need?</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 relative">
                    <input
                      ref={itemInputRef}
                      type="text"
                      value={itemQuery}
                      onChange={(e) => handleItemQueryChange(e.target.value)}
                      onFocus={() => setItemSuggestOpen(true)}
                      onBlur={() => setTimeout(() => setItemSuggestOpen(false), 150)}
                      placeholder="e.g. Drinking Water, Blankets, Meals…"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none placeholder:font-normal"
                      required
                      autoComplete="off"
                    />

                    {/* Autocomplete dropdown */}
                    {itemSuggestOpen && filteredItems.length > 0 && (
                      <div
                        ref={itemDropdownRef}
                        className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden max-h-52 overflow-y-auto"
                      >
                        {/* Group by category */}
                        {(() => {
                          const groups: Record<string, typeof ITEM_SUGGESTIONS> = {};
                          filteredItems.forEach((item) => {
                            if (!groups[item.category]) groups[item.category] = [];
                            groups[item.category].push(item);
                          });
                          return Object.entries(groups).map(([cat, items]) => (
                            <div key={cat}>
                              <div className="px-3 py-1 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 bg-slate-50 border-b border-slate-100">{cat}</div>
                              {items.map((item) => (
                                <button
                                  key={item.label}
                                  type="button"
                                  onMouseDown={() => handleItemSelect(item)}
                                  className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-emerald-50 transition-colors border-b border-slate-50 last:border-0"
                                >
                                  <span className="text-base leading-none">{item.icon}</span>
                                  <div>
                                    <p className="text-xs font-semibold text-slate-800">{item.label}</p>
                                    <p className="text-[10px] text-slate-400">Unit: {item.unit}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="number"
                      min="1"
                      value={formQuantity}
                      onChange={(e) => { setFormQuantity(Number(e.target.value)); setValidationDone(false); }}
                      placeholder="Qty"
                      className="w-full rounded-xl border border-slate-300 bg-white px-2 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                      required
                    />
                    <select
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-1.5 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="Bottles">Btl</option>
                      <option value="Packs">Packs</option>
                      <option value="Boxes">Boxes</option>
                      <option value="Meals">Meals</option>
                      <option value="Kits">Kits</option>
                      <option value="Tarps">Tarps</option>
                      <option value="Kg">Kg</option>
                      <option value="Units">Units</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 2: Where? */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">2 — Where?</p>
                  {formLocation && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle2 size={10} /> Location set
                    </span>
                  )}
                  {!formLocation && validationDone && (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">Required</span>
                  )}
                </div>
                <LocationPicker
                  value={formLocation}
                  onChange={(loc) => { setFormLocation(loc); setValidationDone(false); }}
                  placeholder="Type address or drop a pin on the map…"
                  bounds={[79.75, 6.75, 80.05, 6.95]}
                  defaultCenter={[6.84, 79.88]}
                />
              </div>


              {/* Step 3: Urgency + Optional details */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">3 — How urgent?</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as UrgencyLevel[]).map((level) => {
                    const styles: Record<UrgencyLevel, string> = {
                      CRITICAL: "border-rose-400 bg-rose-50 text-rose-800 ring-1 ring-rose-400",
                      HIGH: "border-orange-400 bg-orange-50 text-orange-800 ring-1 ring-orange-400",
                      MEDIUM: "border-amber-400 bg-amber-50 text-amber-800 ring-1 ring-amber-400",
                      LOW: "border-emerald-400 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-400",
                    };
                    const inactive = "border-slate-200 text-slate-500 hover:bg-slate-50";
                    const emoji: Record<UrgencyLevel, string> = { CRITICAL: "🔴", HIGH: "🟠", MEDIUM: "🟡", LOW: "🟢" };
                    const label: Record<UrgencyLevel, string> = { CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low" };
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => { setFormUrgency(level); setValidationDone(false); }}
                        className={`py-2 px-1 rounded-xl border text-center font-bold text-[11px] transition-all ${
                          formUrgency === level ? styles[level] : inactive
                        }`}
                      >
                        <div>{emoji[level]}</div>
                        <div className="mt-0.5">{label[level]}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Optional extras collapsed in one row */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">People affected <span className="font-normal">(optional)</span></label>
                    <input
                      type="number"
                      min="1"
                      value={formPeopleCount}
                      onChange={(e) => setFormPeopleCount(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 30"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Short note <span className="font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={formReason}
                      onChange={(e) => setFormReason(e.target.value)}
                      placeholder="Any extra context..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Inline validation error */}
              {validationDone && !validationOk && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 flex items-center gap-2 text-xs text-amber-800">
                  <AlertCircle size={14} className="text-amber-500 shrink-0" />
                  Please fill in the item name, quantity, and set a location.
                </div>
              )}

              {/* Spacer at bottom of scrollable area */}
              <div className="pb-1" />
            </div>{/* end scroll body */}

            {/* ── Sticky Footer (always visible) ── */}
            <div className="shrink-0 flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`rounded-xl px-5 py-2 text-xs font-bold text-white shadow-xs flex items-center gap-1.5 transition-all ${
                  formMode === "DISASTER"
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                }`}
              >
                {formMode === "DISASTER" ? "Send Emergency Request" : "Submit Request"} <ArrowRight size={14} />
              </button>
            </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. Post-Submission Confirmation Screen                                    */}
      {/* ========================================================================= */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 text-center animate-slide-up">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 ring-6 ring-emerald-50">
              <CheckCircle2 size={32} />
            </div>

            <h3 className="text-lg font-extrabold text-slate-900">Request Submitted</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Your request has passed validation and entered the coordination pipeline.
            </p>

            <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 inline-block font-mono text-xs font-bold text-slate-800">
              Request ID: <span className="text-emerald-700">#{latestCreatedId || "REQ-1042"}</span>
            </div>

            <div className="mt-1 text-xs text-slate-600">
              Status: <span className="font-bold text-amber-600">Pending Matching</span>
            </div>

            {/* Pipeline Timeline */}
            <div className="mt-4 text-left rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                <CheckCircle2 size={15} />
                <span>Request Created</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                <CheckCircle2 size={15} />
                <span>Validation Passed</span>
              </div>
              <div className="flex items-center gap-2 text-amber-600 font-bold animate-pulse">
                <span className="h-2 w-2 rounded-full bg-amber-500 ml-0.5 mr-0.5" />
                <span>Finding Compatible Resources (PlanningEngine)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-300 ml-0.5 mr-0.5" />
                <span>Volunteer Matching (VolunteerMatcher)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-300 ml-0.5 mr-0.5" />
                <span>Assigned → In Progress → Completed</span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2.5">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  const created = requestsList.find((r) => r.request_id === latestCreatedId);
                  if (created) setSelectedDetailRequest(created);
                }}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs"
              >
                View Request Details
              </button>
              <button
                onClick={() => setShowConfirmation(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. Request Details Modal / Drawer (Full Lifecycle & Civic Privacy Safe)    */}
      {/* ========================================================================= */}
      {selectedDetailRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 animate-slide-up my-6 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-slate-900 text-white">
                  #{selectedDetailRequest.request_id}
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    {selectedDetailRequest.resource_name}
                    {selectedDetailRequest.mode === "DISASTER" && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                        {selectedDetailRequest.disaster_name || "Disaster Relief"}
                      </span>
                    )}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedDetailRequest(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X size={17} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Quantity</span>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {selectedDetailRequest.quantity} {selectedDetailRequest.unit}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">People</span>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {selectedDetailRequest.people_affected} affected
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Urgency</span>
                  <div className="mt-0.5">{renderUrgencyBadge(selectedDetailRequest.urgency)}</div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Needed By</span>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">
                    {selectedDetailRequest.needed_by_date}, {selectedDetailRequest.needed_by_time}
                  </div>
                </div>
              </div>

              {/* Status Lifecycle Timeline */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                  <span>Lifecycle Timeline</span>
                  <span className="text-emerald-600 font-semibold lowercase">
                    {selectedDetailRequest.status === "PENDING"
                      ? "Finding compatible resources"
                      : selectedDetailRequest.status}
                  </span>
                </h4>

                <div className="relative flex items-center justify-between">
                  <div className="absolute top-1/2 left-3 right-3 -translate-y-1/2 h-1 bg-slate-200 -z-0" />
                  {[
                    { label: "Created", step: 1 },
                    { label: "Validated", step: 2 },
                    { label: "Matched", step: 3 },
                    { label: "Assigned", step: 4 },
                    { label: "In Progress", step: 5 },
                    { label: "Completed", step: 6 }
                  ].map((node) => {
                    const currentStep =
                      selectedDetailRequest.status === "COMPLETED"
                        ? 6
                        : selectedDetailRequest.status === "IN_PROGRESS"
                        ? 5
                        : selectedDetailRequest.status === "ASSIGNED"
                        ? 4
                        : selectedDetailRequest.status === "MATCHED"
                        ? 3
                        : 2;

                    const isDone = node.step <= currentStep;

                    return (
                      <div key={node.label} className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${
                            isDone
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "bg-white border-slate-300 text-slate-400"
                          }`}
                        >
                          {isDone ? <Check size={13} /> : node.step}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-700 mt-1 whitespace-nowrap">
                          {node.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Matching Information (Civic Safe - No internal scores) */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Resource & Volunteer Matching
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Resource</span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {selectedDetailRequest.matched_resource ||
                        `${selectedDetailRequest.quantity} ${selectedDetailRequest.unit} ${selectedDetailRequest.resource_name}`}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Matched Donor</span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {selectedDetailRequest.matched_donor || "Community Food Bank"}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Volunteer</span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {selectedDetailRequest.assigned_volunteer || "Awaiting assignment"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <MapPin size={14} className="text-emerald-600" />
                    Affected Location
                  </h4>
                  <span className="font-mono text-[11px] text-slate-500">
                    {selectedDetailRequest.latitude}° N, {selectedDetailRequest.longitude}° E
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="font-bold text-slate-900">{selectedDetailRequest.affected_location}</div>
                  <div className="text-slate-500 mt-0.5">{selectedDetailRequest.address_or_landmark}</div>
                  {selectedDetailRequest.is_in_disaster_zone && (
                    <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      <AlertTriangle size={12} /> Inside Active Disaster Zone
                    </div>
                  )}
                </div>
              </div>

              {/* Reason */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-1.5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Reason for Request
                </h4>
                <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {selectedDetailRequest.reason}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 px-5 py-3 bg-slate-50 flex items-center justify-between">
              {selectedDetailRequest.status === "PENDING" && (
                <button
                  onClick={() => handleCancelRequest(selectedDetailRequest.request_id)}
                  className="rounded-xl border border-rose-200 px-3.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  Cancel Request
                </button>
              )}
              <button
                onClick={() => setSelectedDetailRequest(null)}
                className="ml-auto rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-1.5 text-xs font-bold text-white shadow-xs"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. Edit Request Modal                                                     */}
      {/* ========================================================================= */}
      {editingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-100 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Edit3 className="text-emerald-600" size={16} />
                Edit Request #{editingRequest.request_id}
              </h3>
              <button
                onClick={() => setEditingRequest(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Quantity ({editingRequest.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  value={editingRequest.quantity}
                  onChange={(e) =>
                    setEditingRequest({ ...editingRequest, quantity: Number(e.target.value) })
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Urgency Level</label>
                <select
                  value={editingRequest.urgency}
                  onChange={(e) =>
                    setEditingRequest({ ...editingRequest, urgency: e.target.value as UrgencyLevel })
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                >
                  <option value="CRITICAL">🔴 Critical (Immediate)</option>
                  <option value="HIGH">🟠 High (Within several hours)</option>
                  <option value="MEDIUM">🟡 Medium (Needed today)</option>
                  <option value="LOW">🟢 Low (Can be fulfilled later)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Needed By Time</label>
                <input
                  type="text"
                  value={editingRequest.needed_by_time}
                  onChange={(e) =>
                    setEditingRequest({ ...editingRequest, needed_by_time: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Reason</label>
                <textarea
                  rows={2}
                  value={editingRequest.reason}
                  onChange={(e) =>
                    setEditingRequest({ ...editingRequest, reason: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRequest(null)}
                  className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
