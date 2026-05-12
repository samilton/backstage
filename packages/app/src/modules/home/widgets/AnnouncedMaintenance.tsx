// packages/app/src/modules/home/widgets/AnnouncedMaintenance.tsx
// Mocked maintenance announcements. Intended source: DataDog.

import { makeStyles } from '@material-ui/core/styles';
import { appTokens } from '../../theme/appTheme';

type Maintenance = {
  window: string;
  service: string;
  impact: string;
  severity: 'low' | 'medium' | 'high';
  owner: string;
};

const WINDOWS: Maintenance[] = [
  {
    window: 'Tonight 22:00–22:30 ET',
    service: 'checkout-api · prod',
    impact: 'Brief increase in payment retry latency during DB index rotation.',
    severity: 'medium',
    owner: 'platform-core',
  },
  {
    window: 'Thu 01:00–03:00 ET',
    service: 'search-relevance · prod',
    impact: 'Rolling restart; degraded autocomplete freshness expected.',
    severity: 'low',
    owner: 'search-platform',
  },
  {
    window: 'Fri 23:00–Sat 01:00 ET',
    service: 'etl-orders · warehouse',
    impact: 'Warehouse ingest paused while Snowflake role grants are reconciled.',
    severity: 'high',
    owner: 'data-pipelines',
  },
];

const SEVERITY_COLOR: Record<Maintenance['severity'], string> = {
  low: appTokens.ok,
  medium: appTokens.warn,
  high: appTokens.bad,
};

const useStyles = makeStyles(() => ({
  card: {
    background: appTokens.surface,
    border: `1px solid ${appTokens.border}`,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: `1px solid ${appTokens.border}`,
  },
  title: { fontSize: 13, fontWeight: 600 },
  source: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: appTokens.mute,
  },
  row: {
    padding: '13px 16px',
    borderBottom: `1px solid ${appTokens.border}`,
    '&:last-child': { borderBottom: 'none' },
  },
  topLine: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 5,
  },
  window: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10.5,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: appTokens.accent,
  },
  severity: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10.5,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  swatch: { width: 8, height: 8, display: 'inline-block' },
  service: {
    fontSize: 13,
    fontWeight: 600,
    color: appTokens.ink,
    marginBottom: 4,
  },
  impact: {
    fontSize: 12.5,
    color: appTokens.ink2,
    lineHeight: 1.4,
  },
  owner: {
    marginTop: 6,
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10.5,
    color: appTokens.mute,
  },
}));

export const AnnouncedMaintenance = () => {
  const classes = useStyles();

  return (
    <div className={classes.card}>
      <div className={classes.header}>
        <div className={classes.title}>Announced maintenance</div>
        <div className={classes.source}>source · DataDog</div>
      </div>
      {WINDOWS.map(m => (
        <div key={`${m.window}-${m.service}`} className={classes.row}>
          <div className={classes.topLine}>
            <span className={classes.window}>{m.window}</span>
            <span className={classes.severity} style={{ color: SEVERITY_COLOR[m.severity] }}>
              <span className={classes.swatch} style={{ background: SEVERITY_COLOR[m.severity] }} />
              {m.severity}
            </span>
          </div>
          <div className={classes.service}>{m.service}</div>
          <div className={classes.impact}>{m.impact}</div>
          <div className={classes.owner}>owner · {m.owner}</div>
        </div>
      ))}
    </div>
  );
};
