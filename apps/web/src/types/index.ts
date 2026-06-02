// ============================================================
// NeuralOps — Central TypeScript Type Definitions
// ============================================================

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type IncidentStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "SUPPRESSED";
export type HostStatus = "ONLINE" | "OFFLINE" | "DEGRADED" | "UNKNOWN";
export type ActionStatus = "PENDING" | "PENDING_APPROVAL" | "APPROVED" | "RUNNING" | "SUCCESS" | "FAILED" | "REJECTED";
export type RemediationActionType = "SCALE_OUT" | "RESTART_SERVICE" | "PURGE_LOGS" | "ROTATE_SECRET" | "DRAIN_NODE" | "CUSTOM";

// ─── User & Auth ────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  role: "OWNER" | "ADMIN" | "ENGINEER" | "VIEWER";
  avatarUrl?: string;
  workspaceId: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: "STARTER" | "GROWTH" | "ENTERPRISE";
  hostLimit: number;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ─── Host ───────────────────────────────────────────────────

export interface Host {
  id: string;
  workspaceId: string;
  hostname: string;
  ipAddress: string;
  cloudProvider: "AWS" | "GCP" | "AZURE" | "ON_PREM" | "OTHER";
  region?: string;
  tags: Record<string, string>;
  agentVersion: string;
  lastHeartbeat: string;
  status: HostStatus;
  healthScore?: number; // 0.0–1.0
  openIncidents?: number;
}

// ─── Metrics ────────────────────────────────────────────────

export interface MetricSnapshot {
  cpu_percent_mean: number;
  cpu_percent_std: number;
  cpu_percent_p95: number;
  mem_used_ratio: number;
  mem_pressure: number;
  disk_io_util: number;
  disk_await_ms: number;
  net_bytes_recv_rate: number;
  net_bytes_sent_rate: number;
  net_drop_rate: number;
  load_avg_1m: number;
  load_avg_5m: number;
  process_count_delta: number;
  http_latency_p99: number;
  tcp_retransmit_rate: number;
  timestamp?: string;
}

export interface MetricDataPoint {
  timestamp: string;
  value: number;
}

export interface MetricSeries {
  name: string;
  data: MetricDataPoint[];
  unit?: string;
}

// ─── Incidents ──────────────────────────────────────────────

export interface Incident {
  id: string;
  workspaceId: string;
  hostId: string;
  host?: Host;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  anomalyScore: number;
  anomalyType?: string;
  metricSnapshot: MetricSnapshot;
  llmExplanation?: string;
  rootCauseTags: string[];
  detectedAt: string;
  resolvedAt?: string;
  ttdSeconds?: number;
  ttrSeconds?: number;
  remediationActions?: RemediationAction[];
  featureImportance?: Record<string, number>;
}

export interface IncidentListItem {
  id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  anomalyScore: number;
  anomalyType?: string;
  hostId: string;
  hostname?: string;
  detectedAt: string;
  resolvedAt?: string;
  ttdSeconds?: number;
  ttrSeconds?: number;
}

export interface IncidentFilters {
  severity: Severity[];
  status: IncidentStatus[];
  hostId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
}

// ─── Remediation ────────────────────────────────────────────

export interface RemediationAction {
  id: string;
  incidentId: string;
  workspaceId: string;
  runbookId?: string;
  actionType: RemediationActionType;
  actionParams: Record<string, unknown>;
  approvalRequired: boolean;
  approvedBy?: string;
  approvedAt?: string;
  status: ActionStatus;
  resultLog?: string;
  executedAt?: string;
  durationSeconds?: number;
}

export interface RemediationTimeline {
  timestamp: string;
  event: string;
  details?: string;
  actor?: string;
}

// ─── Analytics ──────────────────────────────────────────────

export interface AnalyticsSummary {
  totalIncidents: number;
  avgMttdSeconds: number;
  avgMttrSeconds: number;
  autoResolvedPercent: number;
  estimatedCostSavings: number;
}

export interface IncidentCountByDay {
  date: string;
  count: number;
}

export interface MttdMttrTrend {
  date: string;
  mttdSeconds: number;
  mttrSeconds: number;
}

export interface HostIncidentCount {
  hostname: string;
  count: number;
  hostId: string;
}

export interface AnomalyTypeDistribution {
  type: string;
  count: number;
  percentage: number;
}

// ─── Runbooks ───────────────────────────────────────────────

export interface Runbook {
  id: string;
  title: string;
  description: string;
  triggerConditions: string[];
  steps: RunbookStep[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export interface RunbookStep {
  order: number;
  title: string;
  description: string;
  actionType?: RemediationActionType;
  params?: Record<string, unknown>;
}

// ─── ML Model Registry ──────────────────────────────────────

export interface MLModel {
  id: string;
  name: string;
  version: string;
  status: "PRODUCTION" | "STAGING" | "ARCHIVED";
  f1Score: number;
  aucRoc: number;
  precision: number;
  recall: number;
  trainedAt: string;
  deployedAt?: string;
  featureCount: number;
  description?: string;
}

// ─── Audit Log ──────────────────────────────────────────────

export interface AuditLog {
  id: string | number;
  workspaceId: string;
  userId?: string;
  userName?: string;
  action: string;
  resource: string;
  resourceId?: string;
  payload: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// ─── API Key ────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
}

// ─── Team Member ────────────────────────────────────────────

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: User["role"];
  avatarUrl?: string;
  joinedAt: string;
  lastActiveAt?: string;
}

// ─── Notification Settings ──────────────────────────────────

export interface NotificationChannel {
  id: string;
  type: "SLACK" | "EMAIL" | "PAGERDUTY";
  name: string;
  config: Record<string, string>;
  enabled: boolean;
  notifyOn: Severity[];
}

// ─── WebSocket Events ───────────────────────────────────────

export type WSEventType =
  | "ANOMALY_DETECTED"
  | "METRIC_UPDATE"
  | "REMEDIATION_DONE"
  | "INCIDENT_UPDATED"
  | "HOST_STATUS_CHANGED"
  | "PING";

export interface WSEvent<T = unknown> {
  type: WSEventType;
  payload: T;
  timestamp: string;
}

export interface AnomalyDetectedPayload {
  incident: IncidentListItem;
}

export interface MetricUpdatePayload {
  hostId: string;
  metrics: MetricSnapshot;
  healthScore: number;
}

export interface RemediationDonePayload {
  incidentId: string;
  actionId: string;
  status: ActionStatus;
  resultLog?: string;
}

// ─── Pagination ─────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

// ─── GraphQL ────────────────────────────────────────────────

export interface GraphQLIncident extends Omit<Incident, "metricSnapshot"> {
  metricSnapshot: string; // JSON string from GraphQL
}

// ─── Service Dependency (D3 graph) ──────────────────────────

export interface ServiceNode {
  id: string;
  label: string;
  type: "host" | "service" | "database" | "cache" | "queue";
  status: HostStatus;
  isAffected?: boolean;
  isCurrent?: boolean;
  x?: number;
  y?: number;
}

export interface ServiceLink {
  source: string;
  target: string;
  strength?: number;
}

export interface ServiceGraph {
  nodes: ServiceNode[];
  links: ServiceLink[];
}
