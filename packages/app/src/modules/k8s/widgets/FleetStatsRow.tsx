// packages/app/src/modules/k8s/widgets/FleetStatsRow.tsx

import { makeStyles } from '@material-ui/core/styles';
import { elliottTokens } from '../../theme/elliottTheme';
import { FleetSummary } from '../clusterFleetApi';

const useStyles = makeStyles(() => ({
  row: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 },
  card: { background: elliottTokens.surface, border: `1px solid ${elliottTokens.border}`, padding: '16px 18px' },
  label: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: elliottTokens.mute, marginBottom: 8,
  },
  value: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 36, fontWeight: 600, lineHeight: 1, marginBottom: 8,
  },
  detail: { fontSize: 12, color: elliottTokens.ink2 },
  ok: { color: elliottTokens.ok }, warn: { color: elliottTokens.warn }, bad: { color: elliottTokens.bad },
}));

const pad = (n: number) => n.toString().padStart(2, '0');

export const FleetStatsRow = ({
  summary,
  selectedCluster,
}: {
  summary?: FleetSummary;
  selectedCluster?: string;
}) => {
  const classes = useStyles();

  // When a cluster is selected, stats reflect just that cluster. Otherwise,
  // fleet-wide totals.
  const scoped = selectedCluster
    ? summary?.clusters.filter(c => c.name === selectedCluster) ?? []
    : summary?.clusters ?? [];

  const totals = scoped.reduce(
    (acc, c) => ({
      clusters: acc.clusters + 1,
      nodes: acc.nodes + c.nodes,
      podsRunning: acc.podsRunning + c.pods.running,
      podsPending: acc.podsPending + c.pods.pending,
      podsFailing: acc.podsFailing + c.pods.failing,
    }),
    { clusters: 0, nodes: 0, podsRunning: 0, podsPending: 0, podsFailing: 0 },
  );

  const capPct = scoped.length > 0
    ? Math.round(scoped.reduce((s, c) => s + c.capacityPercent, 0) / scoped.length)
    : 0;

  return (
    <div className={classes.row}>
      <Stat label="Clusters" value={pad(totals.clusters)} detail={detailFor(scoped)} tone="plain" />
      <Stat label="Nodes" value={String(totals.nodes)} detail={`capacity ${capPct}%`} tone="plain" />
      <Stat label="Pods running" value={totals.podsRunning.toLocaleString()} detail="—" tone="ok" />
      <Stat
        label="Pods pending / failing"
        value={`${totals.podsPending} / ${totals.podsFailing}`}
        detail={firstUnhealthy(scoped)}
        tone={totals.podsFailing > 0 ? 'bad' : totals.podsPending > 0 ? 'warn' : 'plain'}
      />
    </div>
  );
};

const detailFor = (clusters: { region: string }[]): string => {
  if (clusters.length === 0) return '—';
  if (clusters.length === 1) return clusters[0].region || '—';
  const regions = new Set(clusters.map(c => c.region).filter(r => r && r !== '—'));
  return regions.size > 0 ? `across ${regions.size} region${regions.size === 1 ? '' : 's'}` : '—';
};

const firstUnhealthy = (clusters: FleetSummary['clusters']): string => {
  const c = clusters.find(x => x.pods.failing > 0 || x.pods.pending > 0);
  return c ? `investigate ${c.name}` : 'all clear';
};

const Stat = ({ label, value, detail, tone }: {
  label: string; value: string; detail: string;
  tone: 'ok' | 'warn' | 'bad' | 'plain';
}) => {
  const classes = useStyles();
  const toneClass = tone === 'ok' ? classes.ok : tone === 'warn' ? classes.warn : tone === 'bad' ? classes.bad : '';
  return (
    <div className={classes.card}>
      <div className={classes.label}>{label}</div>
      <div className={`${classes.value} ${toneClass}`}>{value}</div>
      <div className={classes.detail}>{detail}</div>
    </div>
  );
};
