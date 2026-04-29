// packages/app/src/modules/k8s/widgets/TopNamespaces.tsx

import { makeStyles } from '@material-ui/core/styles';
import { elliottTokens } from '../../theme/elliottTheme';
import { NamespaceRow } from '../clusterFleetApi';

const useStyles = makeStyles(() => ({
  card: { background: elliottTokens.surface, border: `1px solid ${elliottTokens.border}` },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', borderBottom: `1px solid ${elliottTokens.border}`,
  },
  title: { fontSize: 13, fontWeight: 600 },
  cluster: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, color: elliottTokens.mute },
  meta: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: elliottTokens.mute,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr auto',
    columnGap: 12,
    padding: '12px 16px',
    borderBottom: `1px solid ${elliottTokens.border}`,
    alignItems: 'baseline',
    '&:last-child': { borderBottom: 'none' },
  },
  ns: { fontWeight: 600, fontSize: 13 },
  services: { color: elliottTokens.mute, fontSize: 12, fontFamily: '"JetBrains Mono", ui-monospace, monospace' },
  count: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 12 },
  countOk: { color: elliottTokens.ok },
}));

export const TopNamespaces = ({
  cluster,
  rows,
}: { cluster?: string; rows: NamespaceRow[] }) => {
  const classes = useStyles();
  return (
    <div className={classes.card}>
      <div className={classes.header}>
        <div className={classes.title}>
          Top namespaces <span className={classes.cluster}>· {cluster ?? '—'}</span>
        </div>
        <div className={classes.meta}>by pod count</div>
      </div>
      {rows.length === 0 && (
        <div className={classes.row} style={{ color: elliottTokens.mute }}>
          <span>—</span><span>No pods</span><span />
        </div>
      )}
      {rows.map(r => (
        <div key={`${r.cluster}/${r.namespace}`} className={classes.row}>
          <span className={classes.ns}>{r.namespace}</span>
          <span className={classes.services}>
            {r.topServices.length > 0 ? r.topServices.join(' · ') : '—'}
          </span>
          <span className={`${classes.count} ${classes.countOk}`}>
            ▪ {r.podCount} / {r.podCount}
          </span>
        </div>
      ))}
    </div>
  );
};
