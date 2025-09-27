// Edge computing type definitions - keep all interfaces here!

export interface EdgeNode {
  id: string;
  name: string;
  location: GeographicLocation;
  provider: EdgeProvider;
  status: 'active' | 'inactive' | 'maintenance' | 'degraded';
  capacity: EdgeCapacity;
  workloads: EdgeWorkload[];
  network: NetworkConfiguration;
  storage: StorageConfiguration;
  monitoring: EdgeMonitoring;
  security: EdgeSecurity;
  metadata: EdgeMetadata;
}

export interface GeographicLocation {
  continent: string;
  country: string;
  region: string;
  city: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  timezone: string;
  datacenter?: string;
}

export interface EdgeProvider {
  name: 'cloudflare' | 'fastly' | 'aws-wavelength' | 'azure-edge' | 'google-edge' | 'custom';
  region: string;
  zone: string;
  instanceType: string;
  pricing: PricingInfo;
  sla: SLATerms;
}

export interface PricingInfo {
  cpu: number; // per vCPU per hour
  memory: number; // per GB per hour
  storage: number; // per GB per month
  bandwidth: number; // per GB
  requests: number; // per million requests
  currency: string;
}

export interface SLATerms {
  availability: number; // percentage
  latency: number; // milliseconds
  bandwidth: number; // Mbps
  support: 'basic' | 'premium' | 'enterprise';
}

export interface EdgeCapacity {
  cpu: ResourceCapacity;
  memory: ResourceCapacity;
  storage: ResourceCapacity;
  network: NetworkCapacity;
  gpu?: GPUCapacity;
}

export interface ResourceCapacity {
  total: number;
  available: number;
  allocated: number;
  reserved: number;
  unit: string;
}

export interface NetworkCapacity {
  bandwidth: number; // Mbps
  latency: number; // milliseconds
  connections: number;
  packets_per_second: number;
}

export interface GPUCapacity {
  type: string;
  cores: number;
  memory: number;
  compute_units: number;
}

export interface EdgeWorkload {
  id: string;
  name: string;
  type: 'function' | 'container' | 'vm' | 'static-site' | 'cdn' | 'api-gateway';
  status: 'pending' | 'running' | 'stopped' | 'failed' | 'scaling';
  image?: string;
  runtime: Runtime;
  resources: ResourceRequirements;
  networking: NetworkingConfig;
  scaling: ScalingPolicy;
  deployment: DeploymentConfig;
  health: HealthConfig;
  environment: Record<string, string>;
  secrets: SecretReference[];
  volumes: VolumeMount[];
}

export interface Runtime {
  type: 'nodejs' | 'python' | 'go' | 'rust' | 'java' | 'dotnet' | 'php' | 'ruby' | 'custom';
  version: string;
  entrypoint?: string;
  command?: string[];
  args?: string[];
}

export interface ResourceRequirements {
  cpu: string; // e.g., "100m", "0.5", "2"
  memory: string; // e.g., "128Mi", "1Gi"
  storage?: string; // e.g., "1Gi", "10Gi"
  gpu?: string; // e.g., "1", "0.5"
}

export interface NetworkingConfig {
  ports: PortConfig[];
  domains: string[];
  routing: RoutingRule[];
  ssl: SSLConfig;
  cors?: CORSConfig;
  rateLimit?: RateLimitConfig;
}

export interface PortConfig {
  containerPort: number;
  protocol: 'http' | 'https' | 'tcp' | 'udp' | 'grpc';
  public: boolean;
  ssl?: boolean;
  loadBalancer?: LoadBalancerConfig;
}

export interface RoutingRule {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  weight?: number;
  destination: RoutingDestination;
}

export interface RoutingDestination {
  workloadId?: string;
  url?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface SSLConfig {
  enabled: boolean;
  certificate?: string;
  privateKey?: string;
  autoGenerate: boolean;
  provider?: 'letsencrypt' | 'custom';
}

export interface CORSConfig {
  origins: string[];
  methods: string[];
  headers: string[];
  credentials: boolean;
  maxAge?: number;
}

export interface RateLimitConfig {
  requests: number;
  window: number; // seconds
  burst?: number;
  keyBy: 'ip' | 'user' | 'header' | 'query';
  keyName?: string;
}

export interface LoadBalancerConfig {
  algorithm: 'round-robin' | 'least-connections' | 'weighted' | 'ip-hash';
  healthCheck: HealthCheckConfig;
  sessionAffinity?: boolean;
  timeout?: number;
}

export interface HealthCheckConfig {
  path: string;
  interval: number;
  timeout: number;
  healthyThreshold: number;
  unhealthyThreshold: number;
  expectedStatus?: number;
  expectedBody?: string;
}

export interface ScalingPolicy {
  enabled: boolean;
  minReplicas: number;
  maxReplicas: number;
  metrics: ScalingMetric[];
  behavior: ScalingBehavior;
}

export interface ScalingMetric {
  type: 'cpu' | 'memory' | 'requests' | 'custom';
  threshold: number;
  aggregation: 'average' | 'max' | 'min';
  window: number; // seconds
}

export interface ScalingBehavior {
  scaleUp: ScalingDirection;
  scaleDown: ScalingDirection;
}

export interface ScalingDirection {
  stabilizationWindow: number;
  policies: ScalingPolicy[];
}

export interface DeploymentConfig {
  strategy: 'rolling' | 'blue-green' | 'canary' | 'recreate';
  maxUnavailable: number;
  maxSurge: number;
  progressDeadline: number;
  revisionHistory: number;
}

export interface HealthConfig {
  readiness: ProbeConfig;
  liveness: ProbeConfig;
  startup?: ProbeConfig;
}

export interface ProbeConfig {
  enabled: boolean;
  type: 'http' | 'tcp' | 'exec';
  path?: string;
  port?: number;
  command?: string[];
  initialDelay: number;
  interval: number;
  timeout: number;
  failureThreshold: number;
  successThreshold: number;
}

export interface SecretReference {
  name: string;
  key: string;
  env: string;
  source: 'edge-secrets' | 'k8s-secret' | 'vault' | 'aws-secrets';
}

export interface VolumeMount {
  name: string;
  mountPath: string;
  readOnly: boolean;
  volume: VolumeSource;
}

export interface VolumeSource {
  type: 'emptyDir' | 'configMap' | 'secret' | 'persistent' | 'cache';
  source?: string;
  size?: string;
}

export interface NetworkConfiguration {
  publicIP?: string;
  privateIP: string;
  subnet: string;
  gateway: string;
  dns: string[];
  bandwidth: BandwidthConfig;
  latency: LatencyConfig;
  peering: PeeringConnection[];
  ports?: PortConfig[];
}

export interface BandwidthConfig {
  inbound: number; // Mbps
  outbound: number; // Mbps
  burstable: boolean;
  throttling: ThrottlingConfig;
  connections?: number;
}

export interface ThrottlingConfig {
  enabled: boolean;
  threshold: number; // percentage
  action: 'throttle' | 'queue' | 'drop';
}

export interface LatencyConfig {
  target: number; // milliseconds
  p95: number;
  p99: number;
  jitter: number;
}

export interface PeeringConnection {
  destination: string;
  type: 'private' | 'transit' | 'cdn';
  bandwidth: number;
  latency: number;
  cost: number;
}

export interface StorageConfiguration {
  local: LocalStorage;
  distributed: DistributedStorage;
  cache: CacheStorage;
  backup: BackupConfig;
}

export interface LocalStorage {
  ssd: StorageSpec;
  nvme?: StorageSpec;
  memory?: StorageSpec;
}

export interface DistributedStorage {
  enabled: boolean;
  replication: number;
  consistency: 'eventual' | 'strong';
  encryption: boolean;
}

export interface CacheStorage {
  enabled: boolean;
  size: string;
  eviction: 'lru' | 'lfu' | 'fifo';
  ttl: number;
  compression: boolean;
}

export interface StorageSpec {
  capacity: string;
  used: string;
  available: string;
  iops: number;
  throughput: number; // MB/s
}

export interface BackupConfig {
  enabled: boolean;
  frequency: string; // cron expression
  retention: number; // days
  destination: 'cloud' | 'remote-edge' | 'central';
  compression: boolean;
  encryption: boolean;
}

export interface EdgeMonitoring {
  metrics: EdgeMetrics;
  logs: LoggingConfig;
  traces: TracingConfig;
  alerts: AlertConfig[];
  dashboards: string[];
}

export interface EdgeMetrics {
  cpu: MetricSeries;
  memory: MetricSeries;
  network: NetworkMetrics;
  storage: StorageMetrics;
  application: ApplicationMetrics;
  custom: Record<string, MetricSeries>;
}

export interface MetricSeries {
  current: number;
  average: number;
  peak: number;
  minimum: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  timestamps: number[];
  values: number[];
}

export interface NetworkMetrics {
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
  errors: number;
  drops: number;
  latency: number;
  jitter: number;
}

export interface StorageMetrics {
  readOps: number;
  writeOps: number;
  readBytes: number;
  writeBytes: number;
  utilization: number;
  latency: number;
}

export interface ApplicationMetrics {
  requests: number;
  responses: number;
  errors: number;
  responseTime: number;
  throughput: number;
  availability: number;
}

export interface LoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  destinations: LogDestination[];
  retention: number; // days
  sampling: number; // percentage
  structuredLogging: boolean;
}

export interface LogDestination {
  type: 'local' | 'remote' | 'cloud';
  endpoint?: string;
  format: 'json' | 'text' | 'syslog';
  buffer: boolean;
  compression: boolean;
}

export interface TracingConfig {
  enabled: boolean;
  samplingRate: number;
  exporters: TracingExporter[];
  propagation: string[];
}

export interface TracingExporter {
  type: 'jaeger' | 'zipkin' | 'otlp' | 'datadog';
  endpoint: string;
  headers?: Record<string, string>;
  compression: boolean;
}

export interface AlertConfig {
  name: string;
  condition: AlertCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: AlertChannel[];
  cooldown: number;
  enabled: boolean;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
  threshold: number;
  duration: number;
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count';
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'sms';
  destination: string;
  template?: string;
}

export interface EdgeSecurity {
  authentication: AuthConfig;
  authorization: AuthzConfig;
  encryption: EncryptionConfig;
  firewall: FirewallConfig;
  ddos: DDoSProtection;
  compliance: ComplianceConfig;
}

export interface AuthConfig {
  enabled: boolean;
  methods: AuthMethod[];
  session: SessionConfig;
  mfa: MFAConfig;
}

export interface AuthMethod {
  type: 'jwt' | 'oauth' | 'saml' | 'ldap' | 'api-key';
  provider?: string;
  configuration: Record<string, unknown>;
  enabled: boolean;
}

export interface SessionConfig {
  timeout: number;
  renewable: boolean;
  storage: 'memory' | 'redis' | 'database';
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
}

export interface MFAConfig {
  enabled: boolean;
  methods: ('totp' | 'sms' | 'email' | 'push')[];
  required: boolean;
  backup: boolean;
}

export interface AuthzConfig {
  enabled: boolean;
  model: 'rbac' | 'abac' | 'acl';
  policies: AuthzPolicy[];
  enforcement: 'permit' | 'deny';
}

export interface AuthzPolicy {
  name: string;
  effect: 'allow' | 'deny';
  subjects: string[];
  resources: string[];
  actions: string[];
  conditions?: PolicyCondition[];
}

export interface PolicyCondition {
  attribute: string;
  operator: 'eq' | 'ne' | 'in' | 'nin' | 'contains';
  value: unknown;
}

export interface EncryptionConfig {
  inTransit: TransitEncryption;
  atRest: RestEncryption;
  keyManagement: KeyManagement;
}

export interface TransitEncryption {
  enabled: boolean;
  protocol: 'tls1.2' | 'tls1.3';
  cipherSuites: string[];
  certificates: CertificateConfig[];
}

export interface RestEncryption {
  enabled: boolean;
  algorithm: 'aes256' | 'chacha20';
  keyRotation: boolean;
  rotationPeriod: number; // days
}

export interface KeyManagement {
  provider: 'local' | 'hsm' | 'kms' | 'vault';
  keyDerivation: 'pbkdf2' | 'scrypt' | 'argon2';
  backup: boolean;
  escrow: boolean;
}

export interface CertificateConfig {
  type: 'self-signed' | 'ca-signed' | 'letsencrypt';
  domains: string[];
  autoRenewal: boolean;
  ocspStapling: boolean;
}

export interface FirewallConfig {
  enabled: boolean;
  rules: FirewallRule[];
  defaultPolicy: 'allow' | 'deny';
  logging: boolean;
}

export interface FirewallRule {
  name: string;
  action: 'allow' | 'deny' | 'log';
  direction: 'inbound' | 'outbound' | 'both';
  source: NetworkSelector;
  destination: NetworkSelector;
  ports: PortRange[];
  protocols: string[];
  priority: number;
}

export interface NetworkSelector {
  type: 'ip' | 'cidr' | 'domain' | 'unknown';
  value: string;
}

export interface PortRange {
  start: number;
  end?: number;
}

export interface DDoSProtection {
  enabled: boolean;
  thresholds: DDoSThreshold[];
  mitigations: DDoSMitigation[];
  whitelist: string[];
  blacklist: string[];
}

export interface DDoSThreshold {
  metric: 'requests_per_second' | 'bandwidth' | 'connections';
  threshold: number;
  window: number;
  action: 'monitor' | 'rate_limit' | 'block';
}

export interface DDoSMitigation {
  type: 'rate_limiting' | 'captcha' | 'geo_blocking' | 'behavior_analysis';
  configuration: Record<string, unknown>;
  enabled: boolean;
}

export interface ComplianceConfig {
  frameworks: ('gdpr' | 'ccpa' | 'hipaa' | 'sox' | 'pci-dss')[];
  dataRetention: number; // days
  dataLocation: 'local' | 'regional' | 'global';
  auditLogging: boolean;
  encryption: boolean;
}

export interface EdgeMetadata {
  owner: string;
  project: string;
  environment: 'dev' | 'staging' | 'prod';
  tags: Record<string, string>;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  created: number;
  updated: number;
  version: string;
}

export interface EdgeCluster {
  id: string;
  name: string;
  description: string;
  nodes: string[];
  loadBalancer: ClusterLoadBalancer;
  networking: ClusterNetworking;
  storage: ClusterStorage;
  security: ClusterSecurity;
  orchestration: OrchestrationConfig;
  monitoring: ClusterMonitoring;
}

export interface ClusterLoadBalancer {
  type: 'l4' | 'l7' | 'hybrid';
  algorithm: 'round-robin' | 'least-connections' | 'weighted' | 'geo-proximity';
  healthCheck: HealthCheckConfig;
  failover: FailoverConfig;
  sticky: boolean;
}

export interface FailoverConfig {
  enabled: boolean;
  threshold: number;
  timeout: number;
  strategy: 'active-passive' | 'active-active';
}

export interface ClusterNetworking {
  mesh: ServiceMeshConfig;
  ingress: IngressConfig;
  egress: EgressConfig;
  dns: DNSConfig;
}

export interface ServiceMeshConfig {
  enabled: boolean;
  provider: 'istio' | 'linkerd' | 'consul' | 'custom';
  mtls: boolean;
  observability: boolean;
  policies: NetworkPolicy[];
}

export interface NetworkPolicy {
  name: string;
  selector: Record<string, string>;
  ingress: NetworkRule[];
  egress: NetworkRule[];
}

export interface NetworkRule {
  from?: NetworkSelector[];
  to?: NetworkSelector[];
  ports: PortConfig[];
}

export interface IngressConfig {
  enabled: boolean;
  controller: 'nginx' | 'traefik' | 'envoy' | 'custom';
  routes: IngressRoute[];
  ssl: SSLConfig;
}

export interface IngressRoute {
  host: string;
  paths: PathRule[];
  backend: BackendService;
}

export interface PathRule {
  path: string;
  pathType: 'exact' | 'prefix' | 'regex';
}

export interface BackendService {
  name: string;
  port: number;
  weight?: number;
}

export interface EgressConfig {
  enabled: boolean;
  policies: EgressPolicy[];
  monitoring: boolean;
}

export interface EgressPolicy {
  name: string;
  destinations: string[];
  protocols: string[];
  action: 'allow' | 'deny';
}

export interface DNSConfig {
  provider: 'coredns' | 'bind' | 'cloudflare' | 'route53';
  caching: boolean;
  ttl: number;
  forwarders: string[];
  zones: DNSZone[];
}

export interface DNSZone {
  name: string;
  type: 'forward' | 'reverse';
  records: DNSRecord[];
}

export interface DNSRecord {
  name: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'SRV';
  value: string;
  ttl: number;
}

export interface ClusterStorage {
  distributed: boolean;
  replication: number;
  consistency: 'eventual' | 'strong';
  backup: BackupConfig;
  encryption: boolean;
}

export interface ClusterSecurity {
  rbac: RBACConfig;
  networkPolicies: boolean;
  podSecurityPolicies: boolean;
  admission: AdmissionConfig;
}

export interface RBACConfig {
  enabled: boolean;
  roles: Role[];
  bindings: RoleBinding[];
}

export interface Role {
  name: string;
  rules: PolicyRule[];
}

export interface PolicyRule {
  apiGroups: string[];
  resources: string[];
  verbs: string[];
}

export interface RoleBinding {
  name: string;
  role: string;
  subjects: Subject[];
}

export interface Subject {
  kind: 'User' | 'Group' | 'ServiceAccount';
  name: string;
  namespace?: string;
}

export interface AdmissionConfig {
  controllers: AdmissionController[];
  policies: AdmissionPolicy[];
}

export interface AdmissionController {
  name: string;
  enabled: boolean;
  configuration: Record<string, unknown>;
}

export interface AdmissionPolicy {
  name: string;
  rules: AdmissionRule[];
  action: 'allow' | 'deny' | 'warn';
}

export interface AdmissionRule {
  operations: string[];
  resources: string[];
  conditions: PolicyCondition[];
}

export interface OrchestrationConfig {
  scheduler: SchedulerConfig;
  autoscaling: AutoscalingConfig;
  deployment: DeploymentStrategy;
  rollback: RollbackConfig;
}

export interface SchedulerConfig {
  algorithm: 'default' | 'priority' | 'resource-based' | 'affinity-based';
  constraints: SchedulingConstraint[];
  preferences: SchedulingPreference[];
}

export interface SchedulingConstraint {
  type: 'node-selector' | 'affinity' | 'anti-affinity' | 'resource';
  configuration: Record<string, unknown>;
  required: boolean;
}

export interface SchedulingPreference {
  type: 'node-preference' | 'zone-preference' | 'latency-preference';
  weight: number;
  configuration: Record<string, unknown>;
}

export interface AutoscalingConfig {
  horizontal: HorizontalAutoscaling;
  vertical: VerticalAutoscaling;
  cluster: ClusterAutoscaling;
}

export interface HorizontalAutoscaling {
  enabled: boolean;
  minReplicas: number;
  maxReplicas: number;
  metrics: AutoscalingMetric[];
  behavior: AutoscalingBehavior;
}

export interface VerticalAutoscaling {
  enabled: boolean;
  updateMode: 'off' | 'initial' | 'recreate' | 'auto';
  resourcePolicy: ResourcePolicy;
}

export interface ResourcePolicy {
  cpu: ResourcePolicySpec;
  memory: ResourcePolicySpec;
}

export interface ResourcePolicySpec {
  min: string;
  max: string;
  mode: 'off' | 'auto';
}

export interface ClusterAutoscaling {
  enabled: boolean;
  minNodes: number;
  maxNodes: number;
  scaleDown: ScaleDownConfig;
  nodeGroups: NodeGroup[];
}

export interface ScaleDownConfig {
  enabled: boolean;
  delay: number;
  threshold: number;
  unneededTime: number;
}

export interface NodeGroup {
  name: string;
  instanceType: string;
  minSize: number;
  maxSize: number;
  desiredSize: number;
  zones: string[];
}

export interface AutoscalingMetric {
  type: 'cpu' | 'memory' | 'custom' | 'external';
  name?: string;
  target: MetricTarget;
}

export interface MetricTarget {
  type: 'utilization' | 'value' | 'averageValue';
  value: number;
}

export interface AutoscalingBehavior {
  scaleUp: AutoscalingDirection;
  scaleDown: AutoscalingDirection;
}

export interface AutoscalingDirection {
  stabilizationWindow: number;
  policies: AutoscalingPolicy[];
}

export interface AutoscalingPolicy {
  type: 'pods' | 'percent';
  value: number;
  periodSeconds: number;
}

export interface DeploymentStrategy {
  type: 'rolling' | 'blue-green' | 'canary' | 'a-b';
  parameters: DeploymentParameters;
}

export interface DeploymentParameters {
  maxUnavailable?: number;
  maxSurge?: number;
  canaryPercentage?: number;
  analysisInterval?: number;
  successThreshold?: number;
}

export interface RollbackConfig {
  enabled: boolean;
  triggers: RollbackTrigger[];
  strategy: 'immediate' | 'gradual';
  revisionHistory: number;
}

export interface RollbackTrigger {
  metric: string;
  threshold: number;
  duration: number;
}

export interface ClusterMonitoring {
  metrics: ClusterMetrics;
  events: EventConfig;
  auditing: AuditConfig;
  compliance: ComplianceMonitoring;
}

export interface ClusterMetrics {
  resource: ResourceMetrics;
  application: ApplicationMetrics;
  network: NetworkMetrics;
  security: SecurityMetrics;
}

export interface ResourceMetrics {
  cpu: ClusterResourceMetric;
  memory: ClusterResourceMetric;
  storage: ClusterResourceMetric;
  network: ClusterResourceMetric;
}

export interface ClusterResourceMetric {
  total: number;
  used: number;
  available: number;
  utilization: number;
  requests: number;
  limits: number;
}

export interface SecurityMetrics {
  vulnerabilities: number;
  compliance_score: number;
  policy_violations: number;
  failed_authentications: number;
  suspicious_activities: number;
}

export interface EventConfig {
  retention: number;
  filtering: EventFilter[];
  routing: EventRoute[];
}

export interface EventFilter {
  type: string;
  severity: string[];
  sources: string[];
  namespaces: string[];
}

export interface EventRoute {
  filter: EventFilter;
  destinations: EventDestination[];
}

export interface EventDestination {
  type: 'webhook' | 'email' | 'slack' | 'log';
  endpoint: string;
  format: 'json' | 'text';
}

export interface AuditConfig {
  enabled: boolean;
  policies: AuditPolicy[];
  backends: AuditBackend[];
  retention: number;
}

export interface AuditPolicy {
  level: 'none' | 'metadata' | 'request' | 'requestResponse';
  namespaces: string[];
  verbs: string[];
  resources: AuditResource[];
}

export interface AuditResource {
  group: string;
  resources: string[];
  resourceNames: string[];
}

export interface AuditBackend {
  type: 'log' | 'webhook' | 'dynamic';
  configuration: Record<string, unknown>;
}

export interface ComplianceMonitoring {
  frameworks: string[];
  policies: CompliancePolicy[];
  assessments: ComplianceAssessment[];
  reporting: ComplianceReporting;
}

export interface CompliancePolicy {
  framework: string;
  controls: string[];
  requirements: PolicyRequirement[];
}

export interface PolicyRequirement {
  id: string;
  description: string;
  validation: ValidationRule[];
  remediation: string;
}

export interface ValidationRule {
  type: 'config' | 'runtime' | 'security';
  check: string;
  expected: unknown;
}

export interface ComplianceAssessment {
  framework: string;
  score: number;
  controls: ControlAssessment[];
  findings: ComplianceFinding[];
  timestamp: number;
}

export interface ControlAssessment {
  id: string;
  status: 'compliant' | 'non-compliant' | 'not-applicable';
  evidence: string[];
  gaps: string[];
}

export interface ComplianceFinding {
  severity: 'low' | 'medium' | 'high' | 'critical';
  control: string;
  description: string;
  remediation: string;
  resources: string[];
}

export interface ComplianceReporting {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  format: 'pdf' | 'json' | 'csv';
  automated: boolean;
}