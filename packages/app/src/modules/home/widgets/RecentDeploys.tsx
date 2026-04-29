// packages/app/src/modules/home/widgets/RecentDeploys.tsx
// Placeholder deploy feed. Wire to a CI plugin (GitHub Actions, ArgoCD) later.

import { makeStyles } from '@material-ui/core/styles';
import { elliottTokens } from '../../theme/elliottTheme';

type Deploy = {
  ago: string;
  service: string;
  env: string;
  status: 'succeeded' | 'rolling-back' | 'failed';
};

const DEPLOYS: Deploy[] = [
  { ago: '-4m',  service: 'checkout-api',     env: 'prod',    status: 'succeeded'    },
  { ago: '-11m', service: 'stagedoor-web',    env: 'prod',    status: 'succeeded'    },
  { ago: '-18m', service: 'search-relevance', env: 'prod',    status: 'rolling-back' },
  { ago: '-26m', service: 'feature-flags',    env: 'staging', status: 'succeeded'    },
  { ago: '-39m', service: 'growth-mailer',    env: 'prod',    status: 'succeeded'    },
  { ago: '-52m', service: 'etl-orders',       env: 'prod',    status: 'failed'       },
];

const STATUS_COLOR: Record<Deploy['status'], string> = {
  succeeded:      elliottTokens.ok,
  'rolling-back': elliottTokens.warn,
  failed:         elliottTokens.bad,
};

const useStyles = makeStyles(() => ({
  card: {
    background: elliottTokens.surface,
    border: `1px solid ${elliottTokens.border}`,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: `1px solid ${elliottTokens.border}`,
  },
  title: { fontSize: 13, fontWeight: 600 },
  liveDot: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: elliottTokens.mute,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8, height: 8, borderRadius: '50%', background: elliottTokens.accent,
    display: 'inline-block',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '52px 1fr auto',
    columnGap: 12,
    alignItems: 'baseline',
    padding: '10px 16px',
    fontSize: 13,
    borderBottom: `1px solid ${elliottTokens.border}`,
    '&:last-child': { borderBottom: 'none' },
  },
  ago: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    color: elliottTokens.mute,
    fontSize: 12,
  },
  service: {},
  env: { color: elliottTokens.mute, fontSize: 12 },
  status: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  swatch: { width: 8, height: 8, display: 'inline-block' },
}));

export const RecentDeploys = () => {
  const classes = useStyles();
  return (
    <div className={classes.card}>
      <div className={classes.header}>
        <div className={classes.title}>Recent deploys</div>
        <span className={classes.liveDot}>
          <span className={classes.dot} /> Live
        </span>
      </div>
      {DEPLOYS.map(d => (
        <div key={`${d.service}-${d.ago}`} className={classes.row}>
          <span className={classes.ago}>{d.ago}</span>
          <span>
            <span className={classes.service}>{d.service}</span>
            <span className={classes.env}> · {d.env}</span>
          </span>
          <span className={classes.status} style={{ color: STATUS_COLOR[d.status] }}>
            <span className={classes.swatch} style={{ background: STATUS_COLOR[d.status] }} />
            {d.status}
          </span>
        </div>
      ))}
    </div>
  );
};
