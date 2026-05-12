// packages/app/src/modules/k8s/widgets/FleetEvents.tsx

import { makeStyles } from '@material-ui/core/styles';
import { appTokens } from '../../theme/appTheme';
import { FleetEvent } from '../clusterFleetApi';

const useStyles = makeStyles(() => ({
  card: { background: appTokens.surface, border: `1px solid ${appTokens.border}` },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', borderBottom: `1px solid ${appTokens.border}`,
  },
  title: { fontSize: 13, fontWeight: 600 },
  meta: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: appTokens.mute,
  },
  warnTone: { color: appTokens.warn },
  row: {
    display: 'grid',
    gridTemplateColumns: '52px 1fr',
    columnGap: 12,
    padding: '10px 16px',
    borderBottom: `1px solid ${appTokens.border}`,
    fontSize: 13,
    '&:last-child': { borderBottom: 'none' },
  },
  ago: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 12, color: appTokens.mute },
  topLine: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 2 },
  reason: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  },
  swatch: { width: 8, height: 8, display: 'inline-block' },
  cluster: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10,
    letterSpacing: '0.06em', textTransform: 'uppercase', color: appTokens.mute,
  },
  message: { color: appTokens.ink2, fontSize: 12.5 },
  empty: { padding: '14px 16px', color: appTokens.mute, fontSize: 12.5 },
}));

const ago = (iso: string): string => {
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms) || ms < 0) return '—';
  const m = Math.round(ms / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `-${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `-${h}h`;
  return `-${Math.round(h / 24)}d`;
};

export const FleetEvents = ({
  events,
  selectedCluster,
}: {
  events: FleetEvent[];
  selectedCluster?: string;
}) => {
  const classes = useStyles();
  const scoped = selectedCluster
    ? events.filter(e => e.cluster === selectedCluster)
    : events;
  const warnings = scoped.filter(e => e.type === 'Warning').length;
  return (
    <div className={classes.card}>
      <div className={classes.header}>
        <div className={classes.title}>Fleet events</div>
        <div className={`${classes.meta} ${warnings > 0 ? classes.warnTone : ''}`}>
          warnings · {warnings}
        </div>
      </div>
      {scoped.length === 0 && (
        <div className={classes.empty}>No recent events.</div>
      )}
      {scoped.slice(0, 10).map(e => {
        const tone = e.type === 'Warning' ? appTokens.warn : appTokens.ok;
        return (
          <div key={e.id} className={classes.row}>
            <span className={classes.ago}>{ago(e.occurredAt)}</span>
            <span>
              <span className={classes.topLine}>
                <span className={classes.reason} style={{ color: tone }}>
                  <span className={classes.swatch} style={{ background: tone }} />
                  {e.reason}
                </span>
                <span className={classes.cluster}>· {e.cluster}</span>
              </span>
              <span className={classes.message}>{e.message || `${e.involvedKind} ${e.involvedName}`}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
};
