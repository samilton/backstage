// packages/app/src/modules/k8s/widgets/ClustersTable.tsx

import { makeStyles } from '@material-ui/core/styles';
import { appTokens } from '../../theme/appTheme';
import { ClusterRow, FleetSummary } from '../clusterFleetApi';

const useStyles = makeStyles(() => ({
  card: { background: appTokens.surface, border: `1px solid ${appTokens.border}` },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', borderBottom: `1px solid ${appTokens.border}`,
  },
  title: { fontSize: 13, fontWeight: 600 },
  liveDot: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: appTokens.mute, display: 'inline-flex', alignItems: 'center', gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: '50%', background: appTokens.accent, display: 'inline-block' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: appTokens.mute, background: appTokens.surface2,
    padding: '8px 14px', textAlign: 'left', fontWeight: 600,
  },
  td: { padding: '10px 14px', fontSize: 12.5, borderBottom: `1px solid ${appTokens.border}` },
  tdMono: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 12 },
  rowSelectable: {
    cursor: 'pointer',
    '&:hover': { background: appTokens.surface2 },
  },
  rowSelected: { background: appTokens.surface2 },
  providerChip: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10, padding: '2px 6px',
    background: appTokens.surface2,
    border: `1px solid ${appTokens.borderHard}`,
  },
  bar: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
  },
  barTrack: {
    width: 100, height: 8, background: appTokens.surface2,
    border: `1px solid ${appTokens.borderHard}`,
  },
  barFill: { height: '100%', background: appTokens.accent },
  status: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6,
  },
  swatch: { width: 8, height: 8, display: 'inline-block' },
}));

const STATUS_COLOR: Record<ClusterRow['status'], string> = {
  healthy:  appTokens.ok,
  degraded: appTokens.warn,
  down:     appTokens.bad,
  unknown:  appTokens.mute,
};

const barFillColor = (pct: number): string => {
  if (pct >= 90) return appTokens.bad;
  if (pct >= 75) return appTokens.warn;
  return appTokens.accent;
};

export const ClustersTable = ({
  summary,
  selectedCluster,
  onSelectCluster,
}: {
  summary?: FleetSummary;
  selectedCluster?: string;
  onSelectCluster?: (name: string) => void;
}) => {
  const classes = useStyles();
  // When a cluster is selected, the table scopes to just that row.
  const allRows = summary?.clusters ?? [];
  const rows = selectedCluster
    ? allRows.filter(r => r.name === selectedCluster)
    : allRows;
  return (
    <div className={classes.card}>
      <div className={classes.header}>
        <div className={classes.title}>Clusters</div>
        <span className={classes.liveDot}><span className={classes.dot} /> Live</span>
      </div>
      <table className={classes.table}>
        <thead>
          <tr>
            <th className={classes.th}>Cluster</th>
            <th className={classes.th}>Provider</th>
            <th className={classes.th}>Version</th>
            <th className={classes.th}>Region</th>
            <th className={classes.th}>Nodes</th>
            <th className={classes.th}>Pods (running / pending / failing)</th>
            <th className={classes.th}>Capacity</th>
            <th className={classes.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td className={classes.td} colSpan={8} style={{ color: appTokens.mute }}>
              No clusters configured. Add one under <code>kubernetes.clusterLocatorMethods</code> in <code>app-config.yaml</code>.
            </td></tr>
          )}
          {rows.map(r => (
            <tr
              key={r.name}
              className={`${classes.rowSelectable} ${r.name === selectedCluster ? classes.rowSelected : ''}`}
              onClick={() => onSelectCluster?.(r.name)}
            >
              <td className={`${classes.td} ${classes.tdMono}`}>{r.name}</td>
              <td className={classes.td}>
                <span className={classes.providerChip}>{r.provider}</span>
              </td>
              <td className={`${classes.td} ${classes.tdMono}`}>{r.version}</td>
              <td className={`${classes.td} ${classes.tdMono}`}>{r.region}</td>
              <td className={`${classes.td} ${classes.tdMono}`}>{r.nodes}</td>
              <td className={`${classes.td} ${classes.tdMono}`}>
                {r.pods.running.toLocaleString()} / {r.pods.pending} / {r.pods.failing}
              </td>
              <td className={classes.td}>
                <span className={classes.bar}>
                  <span className={classes.barTrack}>
                    <span
                      className={classes.barFill}
                      style={{ width: `${r.capacityPercent}%`, background: barFillColor(r.capacityPercent) }}
                    />
                  </span>
                  <span className={classes.tdMono}>{r.capacityPercent}%</span>
                </span>
              </td>
              <td className={classes.td}>
                <span className={classes.status} style={{ color: STATUS_COLOR[r.status] }}>
                  <span className={classes.swatch} style={{ background: STATUS_COLOR[r.status] }} />
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
