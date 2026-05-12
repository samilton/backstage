// packages/app/src/modules/k8s/entity/EntityKubernetesContent.tsx
// The Kubernetes tab on a catalog entity page.
//
// Uses the existing per-entity Kubernetes API
// (`KubernetesApi.getObjectsByEntity`) which already handles label
// resolution + multi-cluster fan-out for us — we just consume the
// shaped response.

import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { kubernetesApiRef } from '@backstage/plugin-kubernetes-react';
import useAsync from 'react-use/lib/useAsync';
import { useEffect, useMemo, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { appTokens } from '../../theme/appTheme';

import { EntityPodStatsRow } from './widgets/EntityPodStatsRow';
import { EntityWorkloads } from './widgets/EntityWorkloads';
import { EntityPodsTable } from './widgets/EntityPodsTable';
import { EntityEvents } from './widgets/EntityEvents';
import { EntityIngressPlaceholder } from './widgets/EntityIngressPlaceholder';
import { EntityLogsPlaceholder } from './widgets/EntityLogsPlaceholder';
import {
  computePodStats,
  computeWorkloads,
  computePods,
} from './data';

const useStyles = makeStyles(theme => ({
  page: { padding: 24, display: 'grid', gap: 16 },
  bottomRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.4fr',
    gap: 16,
    [theme.breakpoints.down('md')]: { gridTemplateColumns: '1fr' },
  },
  empty: {
    background: appTokens.surface,
    border: `1px solid ${appTokens.border}`,
    padding: 24,
    color: appTokens.ink2,
  },
  emptyKicker: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: appTokens.mute,
    marginBottom: 8,
  },
  code: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    background: appTokens.surface2,
    border: `1px solid ${appTokens.border}`,
    padding: '1px 6px',
    fontSize: 12,
  },
}));

export const EntityKubernetesContent = () => {
  const classes = useStyles();
  const { entity } = useEntity();
  const k8s = useApi(kubernetesApiRef);

  const k8sId = entity.metadata.annotations?.['backstage.io/kubernetes-id'];

  const { value, loading, error } = useAsync(async () => {
    if (!k8sId) return undefined;
    return k8s.getObjectsByEntity({
      entity,
      auth: {},
    } as any);
  }, [k8s, entity.metadata.uid, k8sId]);

  const stats = useMemo(() => value ? computePodStats(value) : undefined, [value]);
  const workloads = useMemo(() => value ? computeWorkloads(value) : [], [value]);
  const pods = useMemo(() => value ? computePods(value) : [], [value]);

  // Cluster picker for the Pods table — defaults to the cluster with the
  // most pods, like the fleet page.
  const clustersWithPods = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of pods) m.set(p.cluster, (m.get(p.cluster) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  }, [pods]);

  const [focusCluster, setFocusCluster] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!focusCluster && clustersWithPods.length > 0) {
      setFocusCluster(clustersWithPods[0]);
    }
  }, [focusCluster, clustersWithPods]);

  if (!k8sId) {
    return (
      <div className={classes.page}>
        <div className={classes.empty}>
          <div className={classes.emptyKicker}>// Kubernetes</div>
          <p>
            This entity has no <code className={classes.code}>backstage.io/kubernetes-id</code> annotation.
            Add one to its YAML and matching <code className={classes.code}>backstage.io/kubernetes-id</code> labels
            to your workloads to wire this tab.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={classes.page}>
        <div className={classes.empty}>
          <div className={classes.emptyKicker}>// Kubernetes — error</div>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{error.message}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className={classes.page}>
      <EntityPodStatsRow stats={stats} loading={loading} />
      <EntityIngressPlaceholder />
      <EntityWorkloads rows={workloads} loading={loading} />
      <EntityPodsTable
        rows={pods}
        focusCluster={focusCluster}
        onFocusCluster={setFocusCluster}
        clusters={clustersWithPods}
      />
      <div className={classes.bottomRow}>
        <EntityEvents
          k8sId={k8sId}
          response={value}
        />
        <EntityLogsPlaceholder />
      </div>
    </div>
  );
};
