/**
 * Thin fetch client for the NeighborNet Resilience backend.
 *
 * All calls are best-effort: if the backend is unreachable (e.g. during a
 * production build with no API running, or a demo without the backend up)
 * each getter resolves to a safe empty value instead of throwing, so page
 * rendering never hard-fails on a downed API.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000/api";

export interface DashboardMetrics {
  users: number;
  inventory: number;
  requests: number;
  volunteers: number;
  disasters: number;
  alerts: number;
  tasks: number;
  decisions: number;
  events: number;
  community_readiness: number;
  active_requests: number;
  inventory_batches: number;
  active_volunteers: number;
  active_disasters: number;
  active_tasks: number;
  completed_tasks: number;
  pending_human_decisions: number;
  human_decisions_avoided: number;
}

export interface DisasterOverview {
  active_disasters: DisasterEvent[];
  nearby_volunteers: number;
  volunteers_alerted: number;
  volunteers_accepted: number;
  tasks_assigned: number;
  tasks_completed: number;
  unresolved_tasks: number;
  recovery_actions: number;
}

export interface DisasterEvent {
  disaster_id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  affected_zones: string[];
  needs: DisasterNeed[];
  [key: string]: unknown;
}

export interface DisasterNeed {
  need_id: string;
  disaster_id: string;
  category: string;
  quantity: number;
  priority: string;
  required_skills: string[];
  status: string;
  [key: string]: unknown;
}

export interface CoordinationTask {
  task_id: string;
  title: string;
  operating_mode: string;
  priority: string;
  status: string;
  risk_classification: string;
  route_status: string;
  volunteer_id?: string | null;
  disaster_id?: string | null;
  original_task_id?: string | null;
  [key: string]: unknown;
}

export interface VolunteerAlert {
  alert_id: string;
  volunteer_id: string;
  disaster_id: string;
  task_category: string;
  approximate_distance: number;
  status: string;
  urgency: string;
  [key: string]: unknown;
}

export interface Decision {
  decision_id: string;
  decision_type: string;
  title: string;
  description: string;
  risk_classification: "green" | "amber" | "red" | string;
  requires_human_approval: boolean;
  human_approval: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface ActivityEvent {
  event_id: string;
  event_type: string;
  description: string;
  source: string;
  event_data: Record<string, unknown>;
  timestamp?: string;
  [key: string]: unknown;
}

export interface InventoryBatch {
  batch_id: string;
  resource_type: string;
  description: string;
  quantity_available: number;
  quantity_allocated: number;
  quantity_reserved: number;
  unit: string;
  expiry_datetime?: string | null;
  donor_org_id: string;
  status?: string;
  [key: string]: unknown;
}

export interface CommunityRequest {
  request_id: string;
  requesting_org_id: string;
  resource_type: string;
  quantity_requested: number;
  quantity_fulfilled: number;
  urgency_level: string;
  required_by: string;
  status: string;
  purpose?: string | null;
  [key: string]: unknown;
}

export interface Volunteer {
  volunteer_id: string;
  name: string;
  skills: string[];
  preferred_zones: string[];
  last_known_zone?: string | null;
  verified: boolean;
  has_vehicle: boolean;
  reliability_score: number;
  total_deliveries: number;
  status?: string;
  [key: string]: unknown;
}

export function getInventory() {
  return apiGet<InventoryBatch[]>("/inventory", []);
}

export function getRequests() {
  return apiGet<CommunityRequest[]>("/requests", []);
}

export function getVolunteers() {
  return apiGet<Volunteer[]>("/volunteers", []);
}

export function getAuditLog() {
  return apiGet<ActivityEvent[]>("/audit", []);
}

export function getDisruptions() {
  return apiGet<ActivityEvent[]>("/disruptions", []);
}

export function getReadiness() {
  return apiGet<Record<string, unknown>>("/dashboard/readiness", {});
}

export function getDisasterNeeds(disasterId: string) {
  return apiGet<DisasterNeed[]>(`/disasters/${disasterId}/needs`, []);
}

export function getDecision(decisionId: string) {
  return apiGet<Decision | null>(`/decisions/${decisionId}`, null);
}

export function rejectDecision(decisionId: string, reason = "Rejected by coordinator") {
  return apiPost(`/decisions/${decisionId}/reject?reason=${encodeURIComponent(reason)}`);
}

export function injectDisruption(payload: Record<string, unknown>) {
  return apiPost<Record<string, unknown>>("/disruptions/inject", payload);
}

export function generateNormalTask() {
  return apiPost<CoordinationTask>("/tasks/generate-normal");
}

export function patchTaskStatus(taskId: string, status: string) {
  return apiPatch<CoordinationTask>(`/tasks/${taskId}/status`, { status });
}

export function createDisaster(payload: Record<string, unknown>) {
  return apiPost<DisasterEvent>("/disasters", payload);
}

async function apiGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store"
    });
    if (!response.ok) {
      return fallback;
    }
    return (await response.json()) as T;
  } catch {
    // Backend not reachable (build time, offline demo, etc.) - degrade quietly.
    return fallback;
  }
}

async function apiPost<T>(path: string, body?: unknown, fallback?: T): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });
  if (!response.ok) {
    if (fallback !== undefined) return fallback;
    throw new Error(`POST ${path} failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

async function apiPatch<T>(path: string, body: unknown, fallback?: T): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  if (!response.ok) {
    if (fallback !== undefined) return fallback;
    throw new Error(`PATCH ${path} failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export function getDashboardMetrics() {
  return apiGet<DashboardMetrics>("/dashboard/metrics", {
    users: 0,
    inventory: 0,
    requests: 0,
    volunteers: 0,
    disasters: 0,
    alerts: 0,
    tasks: 0,
    decisions: 0,
    events: 0,
    community_readiness: 0,
    active_requests: 0,
    inventory_batches: 0,
    active_volunteers: 0,
    active_disasters: 0,
    active_tasks: 0,
    completed_tasks: 0,
    pending_human_decisions: 0,
    human_decisions_avoided: 0
  });
}

export function getDisasterOverview() {
  return apiGet<DisasterOverview>("/dashboard/disaster-overview", {
    active_disasters: [],
    nearby_volunteers: 0,
    volunteers_alerted: 0,
    volunteers_accepted: 0,
    tasks_assigned: 0,
    tasks_completed: 0,
    unresolved_tasks: 0,
    recovery_actions: 0
  });
}

export function getTasks() {
  return apiGet<CoordinationTask[]>("/tasks", []);
}

export function getAlerts() {
  return apiGet<VolunteerAlert[]>("/alerts", []);
}

export function getDisasters() {
  return apiGet<DisasterEvent[]>("/disasters", []);
}

export function getDecisions() {
  return apiGet<Decision[]>("/decisions/pending", []);
}

export function getActivity(limit = 50) {
  return apiGet<ActivityEvent[]>(`/dashboard/activity?limit=${limit}`, []);
}

export function acceptAlert(alertId: string) {
  return apiPost(`/alerts/${alertId}/accept`);
}

export function declineAlert(alertId: string) {
  return apiPost(`/alerts/${alertId}/decline`);
}

export function approveDecision(decisionId: string, coordinatorId = "coordinator_demo") {
  return apiPost(`/decisions/${decisionId}/approve?coordinator_id=${coordinatorId}`);
}

export function dispatchDisaster(disasterId: string) {
  return apiPost<VolunteerAlert[]>(`/disasters/${disasterId}/dispatch`);
}

export function assignDisasterTasks(disasterId: string) {
  return apiPost<CoordinationTask[]>(`/disasters/${disasterId}/assign`);
}
