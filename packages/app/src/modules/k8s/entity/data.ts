// packages/app/src/modules/k8s/entity/data.ts
// Pure helpers that turn ObjectsByEntityResponse into widget-ready rows.
// No React, no api refs — easy to unit test later.

import type {
  ObjectsByEntityResponse,
  ClusterObjects,
  FetchResponse,
} from '@backstage/plugin-kubernetes-common';
import type {
  V1Deployment,
  V1Pod,
  V1Service,
  V1Ingress,
} from '@kubernetes/client-node';

// ── narrow helpers over the FetchResponse union ────────────────────────────
const ofType = <T extends FetchResponse['type']>(
  resources: FetchResponse[],
  type: T,
): Extract<FetchResponse, { type: T }>['resources'] => {
  for (const r of resources) {
    if (r.type === type) return r.resources as never;
  }
  return [] as never;
};

export const podsIn       = (c: ClusterObjects): V1Pod[]        => ofType(c.resources, 'pods');
export const deploysIn    = (c: ClusterObjects): V1Deployment[] => ofType(c.resources, 'deployments');
export const servicesIn   = (c: ClusterObjects): V1Service[]    => ofType(c.resources, 'services');
export const ingressesIn  = (c: ClusterObjects): V1Ingress[]    => ofType(c.resources, 'ingresses');

// ── stats row aggregation ──────────────────────────────────────────────────
export type EntityPodStats = {
  desired: number;
  ready: number;
  degraded: number;        // pods Pending or NotReady
  failing: number;
  totalRestarts: number;
  firstDegradedCluster?: string;
  image?: string;          // most-common container image short ref (sha or tag)
  imageRepo?: string;      // pre-`@`/pre-`:` part for the subtitle
};

const isPodReady = (p: V1Pod): boolean =>
  (p.status?.containerStatuses ?? []).every(c => c.ready);

const isPodPending = (p: V1Pod): boolean =>
  p.status?.phase === 'Pending';

const isPodFailing = (p: V1Pod): boolean =>
  p.status?.phase === 'Failed' || p.status?.phase === 'Unknown';

export const computePodStats = (resp: ObjectsByEntityResponse): EntityPodStats => {
  let desired = 0;
  let ready = 0;
  let degraded = 0;
  let failing = 0;
  let totalRestarts = 0;
  let firstDegradedCluster: string | undefined;
  const imageCounts = new Map<string, number>();

  for (const cluster of resp.items) {
    for (const d of deploysIn(cluster)) {
      desired += d.spec?.replicas ?? 0;
    }
    for (const p of podsIn(cluster)) {
      const pending = isPodPending(p);
      const failed = isPodFailing(p);
      const podReady = isPodReady(p) && !pending && !failed;
      if (podReady) ready++;
      else if (pending || !podReady) {
        degraded++;
        firstDegradedCluster = firstDegradedCluster ?? cluster.cluster.name;
      }
      if (failed) failing++;

      for (const cs of p.status?.containerStatuses ?? []) {
        totalRestarts += cs.restartCount ?? 0;
        if (cs.image) {
          imageCounts.set(cs.image, (imageCounts.get(cs.image) ?? 0) + 1);
        }
      }
    }
  }

  // Most-common image wins
  let image: string | undefined;
  let max = 0;
  for (const [img, n] of imageCounts) {
    if (n > max) { max = n; image = img; }
  }

  // 'ghcr.io/acme/checkout-api:a91b2c4' → repo='ghcr.io/acme/checkout-api', tag='a91b2c4'
  let imageRepo: string | undefined;
  let imageShort = image;
  if (image) {
    // strip @sha256:... if present, prefer the colon tag for the short label
    const at = image.indexOf('@');
    const trimmed = at >= 0 ? image.slice(0, at) : image;
    const colon = trimmed.lastIndexOf(':');
    if (colon > trimmed.lastIndexOf('/')) {
      imageRepo = trimmed.slice(0, colon);
      imageShort = trimmed.slice(colon + 1);
    } else {
      imageRepo = trimmed;
      imageShort = at >= 0 ? image.slice(at + 8, at + 16) : 'latest';
    }
  }

  return {
    desired,
    ready,
    degraded,
    failing,
    totalRestarts,
    firstDegradedCluster,
    image: imageShort,
    imageRepo,
  };
};

// ── workloads per cluster ──────────────────────────────────────────────────
export type WorkloadRow = {
  cluster: string;
  region?: string;        // best-effort — derived from cluster name
  kind: 'Deployment' | 'StatefulSet' | 'DaemonSet';
  name: string;
  namespace: string;
  replicasReady: number;
  replicasDesired: number;
  image?: string;
  strategy: string;
  ageMs?: number;
  status: 'healthy' | 'degraded' | 'down';
};

const inferRegion = (clusterName: string): string | undefined => {
  const m = clusterName.match(/(us|eu|ap|sa|ca|me|af)-(east|west|north|south|central|northeast|southeast|northwest|southwest)-\d/i);
  return m ? m[0] : undefined;
};

const firstContainerImage = (d: V1Deployment): string | undefined =>
  d.spec?.template?.spec?.containers?.[0]?.image;

const ageMsOf = (timestamp?: string | Date): number | undefined => {
  if (!timestamp) return undefined;
  const t = timestamp instanceof Date ? timestamp.getTime() : Date.parse(String(timestamp));
  return Number.isNaN(t) ? undefined : Date.now() - t;
};

export const computeWorkloads = (resp: ObjectsByEntityResponse): WorkloadRow[] => {
  const rows: WorkloadRow[] = [];
  for (const cluster of resp.items) {
    for (const d of deploysIn(cluster)) {
      const desired = d.spec?.replicas ?? 0;
      const ready = d.status?.readyReplicas ?? 0;
      const status: WorkloadRow['status'] =
        desired === 0 ? 'down' :
        ready < desired ? 'degraded' : 'healthy';
      rows.push({
        cluster: cluster.cluster.name,
        region: inferRegion(cluster.cluster.name),
        kind: 'Deployment',
        name: d.metadata?.name ?? '—',
        namespace: d.metadata?.namespace ?? '—',
        replicasReady: ready,
        replicasDesired: desired,
        image: firstContainerImage(d),
        strategy: d.spec?.strategy?.type ?? 'RollingUpdate',
        ageMs: ageMsOf(d.metadata?.creationTimestamp as unknown as string),
        status,
      });
    }
  }
  return rows;
};

// ── pods table ─────────────────────────────────────────────────────────────
export type PodRow = {
  cluster: string;
  name: string;
  namespace: string;
  containersReady: number;
  containersTotal: number;
  node: string;
  ageMs?: number;
  restarts: number;
  cpuMillicores?: number;
  memBytes?: number;
  phase: string;
  ready: boolean;
};

export const computePods = (resp: ObjectsByEntityResponse): PodRow[] => {
  const rows: PodRow[] = [];
  for (const cluster of resp.items) {
    // Index podMetrics by pod name for quick lookup.
    // ClientPodStatus shape varies; we read defensively.
    const metricsByName = new Map<string, { cpu?: number; mem?: number }>();
    for (const m of cluster.podMetrics ?? []) {
      const name = (m as any)?.pod?.metadata?.name ?? (m as any)?.podName;
      const cpu = (m as any)?.cpu?.currentUsage ?? (m as any)?.containers?.[0]?.cpuUsage?.currentUsage;
      const mem = (m as any)?.memory?.currentUsage ?? (m as any)?.containers?.[0]?.memoryUsage?.currentUsage;
      if (name) metricsByName.set(name, { cpu: numberOrUndef(cpu), mem: numberOrUndef(mem) });
    }
    for (const p of podsIn(cluster)) {
      const cs = p.status?.containerStatuses ?? [];
      const containersReady = cs.filter(c => c.ready).length;
      const containersTotal = cs.length;
      const restarts = cs.reduce((s, c) => s + (c.restartCount ?? 0), 0);
      const name = p.metadata?.name ?? '—';
      const m = metricsByName.get(name);
      rows.push({
        cluster: cluster.cluster.name,
        name,
        namespace: p.metadata?.namespace ?? '—',
        containersReady,
        containersTotal,
        node: p.spec?.nodeName ?? '—',
        ageMs: ageMsOf(p.status?.startTime as unknown as string),
        restarts,
        cpuMillicores: m?.cpu,
        memBytes: m?.mem,
        phase: p.status?.phase ?? '—',
        ready: containersReady === containersTotal && containersTotal > 0,
      });
    }
  }
  return rows;
};

const numberOrUndef = (v: unknown): number | undefined => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
};

// ── time formatting ────────────────────────────────────────────────────────
export const fmtAge = (ms?: number): string => {
  if (ms === undefined || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h${m % 60 ? (m % 60).toString().padStart(2, '0') + 'm' : ''}`;
  const d = Math.floor(h / 24);
  return `${d}d${h % 24 ? (h % 24) + 'h' : ''}`;
};
