// packages/app/src/modules/k8s/entity/widgets/EntityWorkloads.tsx

import { makeStyles } from '@material-ui/core/styles';
import { appTokens } from '../../../theme/appTheme';
import { WorkloadRow, fmtAge } from '../data';

const useStyles = makeStyles(() => ({
  card: { background: appTokens.surface, border: `1px solid ${appTokens.border}` },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', borderBottom: `1px solid ${appTokens.border}`,
  },
  title: { fontSize: 13, fontWeight: 600 },
  meta: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: appTokens.mute,
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: appTokens.mute, background: appTokens.surface2,
    padding: '8px 14px', textAlign: 'left', fontWeight: 600,
  },
  td: { padding: '10px 14px', fontSize: 12.5, borderBottom: `1px solid ${appTokens.border}` },
  tdMono: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 12 },
  cluster: { display: 'flex', alignItems: 'center', gap: 8 },
  swatch: { width: 8, height: 8, display: 'inline-block' },
  region: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10, color: appTokens.mute,
  },
  kindChip: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10, padding: '2px 6px',
    background: appTokens.surface2,
    border: `1px solid ${appTokens.borderHard}`,
  },
  bar: { display: 'inline-flex', alignItems: 'center', gap: 8 },
  barTrack: {
    width: 120, height: 8, background: appTokens.surface2,
    border: `1px solid ${appTokens.borderHard}`,
  },
  barFill: { height: '100%' },
}));

const STATUS_COLOR: Record<WorkloadRow['status'], string> = {
  healthy:  appTokens.ok,
  degraded: appTokens.warn,
  down:     appTokens.bad,
};

const imageTag = (img?: string): string => {
  if (!img) return '—';
  const at = img.indexOf('@');
  if (at >= 0) return img.slice(at + 8, at + 16);
  const colon = img.lastIndexOf(':');
  if (colon > img.lastIndexOf('/')) return img.slice(colon + 1);
  return 'latest';
};

export const EntityWorkloads = ({
  rows,
  loading,
}: { rows: WorkloadRow[]; loading?: boolean }) => {
  const classes = useStyles();
  return (
    <div className={classes.card}>
      <div className={classes.header}>
        <div className={classes.title}>Workloads per cluster</div>
        <div className={classes.meta}>{rows.length} workload{rows.length === 1 ? '' : 's'}</div>
      </div>
      <table className={classes.table}>
        <thead>
          <tr>
            <th className={classes.th}>Cluster</th>
            <th className={classes.th}>Kind</th>
            <th className={classes.th}>Workload</th>
            <th className={classes.th}>Replicas</th>
            <th className={classes.th}>Image</th>
            <th className={classes.th}>Strategy</th>
            <th className={classes.th}>Age</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td className={classes.td} colSpan={7} style={{ color: appTokens.mute }}>
              {loading ? 'Loading…' : 'No workloads found.'}
            </td></tr>
          )}
          {rows.map(r => {
            const pct = r.replicasDesired > 0 ? Math.round((r.replicasReady / r.replicasDesired) * 100) : 0;
            return (
              <tr key={`${r.cluster}/${r.namespace}/${r.name}`}>
                <td className={classes.td}>
                  <span className={classes.cluster}>
                    <span className={classes.swatch} style={{ background: STATUS_COLOR[r.status] }} />
                    <span className={classes.tdMono}>
                      {r.cluster}
                      {r.region && <><br /><span className={classes.region}>{r.region}</span></>}
                    </span>
                  </span>
                </td>
                <td className={classes.td}><span className={classes.kindChip}>{r.kind}</span></td>
                <td className={`${classes.td} ${classes.tdMono}`}>{r.name} · {r.namespace}</td>
                <td className={classes.td}>
                  <span className={classes.bar}>
                    <span className={classes.barTrack}>
                      <span
                        className={classes.barFill}
                        style={{ width: `${pct}%`, background: STATUS_COLOR[r.status] }}
                      />
                    </span>
                    <span className={classes.tdMono}>{r.replicasReady}/{r.replicasDesired}</span>
                  </span>
                </td>
                <td className={`${classes.td} ${classes.tdMono}`}>{imageTag(r.image)}</td>
                <td className={`${classes.td} ${classes.tdMono}`}>{r.strategy}</td>
                <td className={`${classes.td} ${classes.tdMono}`}>{fmtAge(r.ageMs)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
