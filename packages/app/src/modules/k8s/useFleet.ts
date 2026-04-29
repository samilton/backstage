// packages/app/src/modules/k8s/useFleet.ts
// Single hook that owns all the data the fleet page renders.
// Polls every 30s for the summary + events, refetches namespaces when
// the selected cluster changes.

import { useApi } from '@backstage/core-plugin-api';
import { kubernetesApiRef } from '@backstage/plugin-kubernetes-react';
import { useEffect, useMemo, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import {
  ClusterFleetClient,
  FleetEvent,
  FleetSummary,
  NamespaceRow,
} from './clusterFleetApi';

export const useFleet = () => {
  const k8s = useApi(kubernetesApiRef);
  const client = useMemo(() => new ClusterFleetClient(k8s), [k8s]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const summaryAsync = useAsync(async () => client.summary(), [client, tick]);
  const eventsAsync  = useAsync(async () => client.events({ sinceMinutes: 60 }), [client, tick]);

  const [selected, setSelected] = useState<string | undefined>(undefined);
  const summary = summaryAsync.value;

  // `focus` is the cluster TopNamespaces actually queries. Equals `selected`
  // when set; otherwise falls back to the busiest cluster so the namespaces
  // panel isn't blank in "All clusters" mode.
  const focus = selected ?? (summary && summary.clusters.length > 0
    ? [...summary.clusters].sort(
        (a, b) => b.pods.running + b.pods.pending - (a.pods.running + a.pods.pending),
      )[0].name
    : undefined);

  const namespacesAsync = useAsync<() => Promise<NamespaceRow[]>>(async () => {
    if (!focus) return [];
    return client.topNamespaces(focus, 6);
  }, [client, focus, tick]);

  return {
    summary,
    summaryLoading: summaryAsync.loading,
    summaryError: summaryAsync.error,

    events: (eventsAsync.value ?? []) as FleetEvent[],
    eventsLoading: eventsAsync.loading,

    namespaces: (namespacesAsync.value ?? []) as NamespaceRow[],
    namespacesLoading: namespacesAsync.loading,

    selectedCluster: selected,
    focusCluster: focus,
    selectCluster: setSelected,
  } as { summary: FleetSummary | undefined } & Record<string, any>;
};
