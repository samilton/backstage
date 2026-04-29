// packages/app/src/modules/k8s/clusterFleetApi.ts
// Talks to each configured cluster via the Backstage kubernetes plugin's
// proxy. Auth + TLS handled server-side by `@backstage/plugin-kubernetes-backend`
// using the cluster config in app-config.yaml. We just call REST.
//
// Quick wire-up: single-cluster (orbstack) friendly, but the fan-out is
// already cluster-array shaped so adding more clusters is a config change.

import type { KubernetesApi } from '@backstage/plugin-kubernetes-react';

export type ClusterRow = {
  name: string;
  provider: string;
  version: string;
  region: string;
  nodes: number;
  pods: { running: number; pending: number; failing: number };
  capacityPercent: number; // 0–100, requests / allocatable, CPU
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  reason?: string; // when status !== 'healthy'
};

export type FleetSummary = {
  clusters: ClusterRow[];
  totals: {
    clusters: number;
    nodes: number;
    podsRunning: number;
    podsPending: number;
    podsFailing: number;
  };
  asOf: string;
};

export type FleetEvent = {
  id: string;
  cluster: string;
  namespace: string;
  reason: string;
  type: 'Normal' | 'Warning';
  message: string;
  involvedKind: string;
  involvedName: string;
  occurredAt: string;
};

export type NamespaceRow = {
  cluster: string;
  namespace: string;
  podCount: number;
  topServices: string[];
};

// ── CPU parser ─────────────────────────────────────────────────────────────
// k8s CPU values come as "100m" (millicores) or "1" / "1.5" (cores).
const parseCpu = (v: string | undefined): number => {
  if (!v) return 0;
  if (v.endsWith('m')) return Number(v.slice(0, -1)) / 1000;
  return Number(v);
};

// ── Provider / region inference from cluster name + auth ───────────────────
const inferProvider = (name: string, authProvider: string): string => {
  if (/orbstack|colima|kind|minikube|k3[ds]/i.test(name)) return 'local';
  if (/eks/i.test(name)) return 'EKS';
  if (/gke/i.test(name)) return 'GKE';
  if (/aks/i.test(name)) return 'AKS';
  if (authProvider === 'aws') return 'EKS';
  if (authProvider === 'google') return 'GKE';
  if (authProvider === 'azure') return 'AKS';
  return authProvider;
};

const inferRegion = (name: string): string => {
  // Common patterns: prod-eu-west-1, staging-us-east-2, etc.
  const m = name.match(/(us|eu|ap|sa|ca|me|af)-(east|west|north|south|central|northeast|southeast|northwest|southwest)-\d/i);
  return m ? m[0] : '—';
};

// ── proxy helper ───────────────────────────────────────────────────────────
const proxyJson = async <T,>(api: KubernetesApi, clusterName: string, path: string): Promise<T> => {
  const res = await api.proxy({ clusterName, path });
  if (!res.ok) {
    throw new Error(`${clusterName} ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
};

// ── per-cluster summary ────────────────────────────────────────────────────
type K8sList<T> = { items: T[] };
type K8sNode = {
  status?: {
    nodeInfo?: { kubeletVersion?: string };
    allocatable?: { cpu?: string };
    conditions?: Array<{ type: string; status: string }>;
  };
};
type K8sPod = {
  metadata?: { namespace?: string; ownerReferences?: Array<{ kind: string; name: string }> };
  spec?: { containers?: Array<{ resources?: { requests?: { cpu?: string } } }> };
  status?: { phase?: string };
};
type K8sEvent = {
  metadata?: { namespace?: string; uid?: string };
  type?: 'Normal' | 'Warning';
  reason?: string;
  message?: string;
  involvedObject?: { kind?: string; name?: string; namespace?: string };
  lastTimestamp?: string;
  eventTime?: string;
  firstTimestamp?: string;
};

const summarizeCluster = async (
  api: KubernetesApi,
  cluster: { name: string; authProvider: string },
): Promise<ClusterRow> => {
  try {
    const [nodes, pods] = await Promise.all([
      proxyJson<K8sList<K8sNode>>(api, cluster.name, '/api/v1/nodes'),
      proxyJson<K8sList<K8sPod>>(api, cluster.name, '/api/v1/pods?limit=2000'),
    ]);

    let allocCpu = 0;
    let kubeVersion = '';
    let nodeNotReady = 0;
    for (const n of nodes.items) {
      allocCpu += parseCpu(n.status?.allocatable?.cpu);
      kubeVersion ||= (n.status?.nodeInfo?.kubeletVersion ?? '').replace(/^v/, '');
      const ready = n.status?.conditions?.find(c => c.type === 'Ready');
      if (ready && ready.status !== 'True') nodeNotReady++;
    }

    let running = 0, pending = 0, failing = 0, requestedCpu = 0;
    for (const p of pods.items) {
      const phase = p.status?.phase ?? '';
      if (phase === 'Running' || phase === 'Succeeded') running++;
      else if (phase === 'Pending') pending++;
      else if (phase === 'Failed' || phase === 'Unknown') failing++;
      for (const c of p.spec?.containers ?? []) {
        requestedCpu += parseCpu(c.resources?.requests?.cpu);
      }
    }

    const capacityPercent = allocCpu > 0
      ? Math.min(100, Math.round((requestedCpu / allocCpu) * 100))
      : 0;

    let status: ClusterRow['status'] = 'healthy';
    let reason: string | undefined;
    if (nodeNotReady > 0) { status = 'degraded'; reason = `${nodeNotReady} node(s) NotReady`; }
    else if (capacityPercent >= 90) { status = 'degraded'; reason = `cpu requests at ${capacityPercent}%`; }
    else if (failing > 0) { status = 'degraded'; reason = `${failing} pod(s) failing`; }

    return {
      name: cluster.name,
      provider: inferProvider(cluster.name, cluster.authProvider),
      version: kubeVersion || '—',
      region: inferRegion(cluster.name),
      nodes: nodes.items.length,
      pods: { running, pending, failing },
      capacityPercent,
      status,
      reason,
    };
  } catch (err) {
    return {
      name: cluster.name,
      provider: inferProvider(cluster.name, cluster.authProvider),
      version: '—',
      region: inferRegion(cluster.name),
      nodes: 0,
      pods: { running: 0, pending: 0, failing: 0 },
      capacityPercent: 0,
      status: 'down',
      reason: err instanceof Error ? err.message : String(err),
    };
  }
};

// ── public API ─────────────────────────────────────────────────────────────
export class ClusterFleetClient {
  constructor(private readonly k8s: KubernetesApi) {}

  async summary(): Promise<FleetSummary> {
    const clusters = await this.k8s.getClusters();
    const rows = await Promise.all(clusters.map(c => summarizeCluster(this.k8s, c)));
    const totals = rows.reduce(
      (acc, r) => ({
        clusters: acc.clusters + 1,
        nodes: acc.nodes + r.nodes,
        podsRunning: acc.podsRunning + r.pods.running,
        podsPending: acc.podsPending + r.pods.pending,
        podsFailing: acc.podsFailing + r.pods.failing,
      }),
      { clusters: 0, nodes: 0, podsRunning: 0, podsPending: 0, podsFailing: 0 },
    );
    return { clusters: rows, totals, asOf: new Date().toISOString() };
  }

  async events(opts?: { sinceMinutes?: number }): Promise<FleetEvent[]> {
    const sinceMs = (opts?.sinceMinutes ?? 60) * 60 * 1000;
    const cutoff = Date.now() - sinceMs;
    const clusters = await this.k8s.getClusters();
    const all: FleetEvent[] = [];
    await Promise.all(clusters.map(async c => {
      try {
        const data = await proxyJson<K8sList<K8sEvent>>(this.k8s, c.name, '/api/v1/events?limit=200');
        for (const e of data.items) {
          const ts = e.eventTime ?? e.lastTimestamp ?? e.firstTimestamp;
          if (!ts) continue;
          if (Date.parse(ts) < cutoff) continue;
          all.push({
            id: `${c.name}/${e.metadata?.namespace ?? ''}/${e.metadata?.uid ?? ts}`,
            cluster: c.name,
            namespace: e.metadata?.namespace ?? e.involvedObject?.namespace ?? '—',
            reason: e.reason ?? 'Event',
            type: e.type ?? 'Normal',
            message: e.message ?? '',
            involvedKind: e.involvedObject?.kind ?? '',
            involvedName: e.involvedObject?.name ?? '',
            occurredAt: ts,
          });
        }
      } catch {
        // one cluster down doesn't fail the feed
      }
    }));
    all.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
    return all.slice(0, 50);
  }

  async topNamespaces(clusterName: string, limit = 6): Promise<NamespaceRow[]> {
    try {
      const pods = await proxyJson<K8sList<K8sPod>>(this.k8s, clusterName, '/api/v1/pods?limit=2000');
      const byNs = new Map<string, { count: number; owners: Map<string, number> }>();
      for (const p of pods.items) {
        const ns = p.metadata?.namespace ?? 'default';
        const bucket = byNs.get(ns) ?? { count: 0, owners: new Map() };
        bucket.count++;
        const owner = p.metadata?.ownerReferences?.[0];
        if (owner) {
          // Strip ReplicaSet hash suffix to get the deployment-ish name
          const stem = owner.name.replace(/-[a-f0-9]{6,10}$/, '');
          bucket.owners.set(stem, (bucket.owners.get(stem) ?? 0) + 1);
        }
        byNs.set(ns, bucket);
      }
      const rows: NamespaceRow[] = [...byNs.entries()].map(([ns, b]) => ({
        cluster: clusterName,
        namespace: ns,
        podCount: b.count,
        topServices: [...b.owners.entries()]
          .sort((a, c) => c[1] - a[1])
          .slice(0, 3)
          .map(([n]) => n),
      }));
      rows.sort((a, b) => b.podCount - a.podCount);
      return rows.slice(0, limit);
    } catch {
      return [];
    }
  }
}
