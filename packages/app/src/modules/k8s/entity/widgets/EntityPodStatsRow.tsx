// packages/app/src/modules/k8s/entity/widgets/EntityPodStatsRow.tsx

import { makeStyles } from '@material-ui/core/styles';
import { appTokens } from '../../../theme/appTheme';
import { EntityPodStats } from '../data';

const useStyles = makeStyles(() => ({
  row: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 },
  card: {
    background: appTokens.surface,
    border: `1px solid ${appTokens.border}`,
    padding: '16px 18px',
  },
  label: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: appTokens.mute, marginBottom: 8,
  },
  value: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 36, fontWeight: 600, lineHeight: 1, marginBottom: 8,
    wordBreak: 'break-all',
  },
  imageValue: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 22, fontWeight: 600, lineHeight: 1.1, marginBottom: 8,
    wordBreak: 'break-all',
  },
  detail: { fontSize: 12, color: appTokens.ink2, wordBreak: 'break-all' },
  ok: { color: appTokens.ok }, warn: { color: appTokens.warn }, bad: { color: appTokens.bad },
}));

const pad = (n: number) => n.toString().padStart(2, '0');

export const EntityPodStatsRow = ({
  stats,
  loading,
}: {
  stats?: EntityPodStats;
  loading?: boolean;
}) => {
  const classes = useStyles();
  if (!stats) {
    return (
      <div className={classes.row}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={classes.card}>
            <div className={classes.label}>{loading ? 'Loading' : '—'}</div>
            <div className={classes.value}>—</div>
            <div className={classes.detail}>—</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={classes.row}>
      <div className={classes.card}>
        <div className={classes.label}>Healthy pods</div>
        <div className={`${classes.value} ${classes.ok}`}>{stats.ready}</div>
        <div className={classes.detail}>of {stats.desired || '—'} desired</div>
      </div>
      <div className={classes.card}>
        <div className={classes.label}>Degraded pods</div>
        <div className={`${classes.value} ${stats.degraded > 0 ? classes.warn : ''}`}>
          {pad(stats.degraded)}
        </div>
        <div className={classes.detail}>
          {stats.firstDegradedCluster ? `${stats.firstDegradedCluster} · NotReady` : 'all clear'}
        </div>
      </div>
      <div className={classes.card}>
        <div className={classes.label}>Restarts · all-time</div>
        <div className={`${classes.value} ${stats.totalRestarts > 0 ? classes.warn : ''}`}>
          {pad(stats.totalRestarts)}
        </div>
        <div className={classes.detail}>across all pods</div>
      </div>
      <div className={classes.card}>
        <div className={classes.label}>Image</div>
        <div className={classes.imageValue}>{stats.image ?? '—'}</div>
        <div className={classes.detail}>{stats.imageRepo ?? '—'}</div>
      </div>
    </div>
  );
};
