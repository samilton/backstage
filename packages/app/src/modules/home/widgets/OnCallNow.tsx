// packages/app/src/modules/home/widgets/OnCallNow.tsx
// Placeholder on-call list. Wire to PagerDuty / Opsgenie plugin later.

import { makeStyles } from '@material-ui/core/styles';
import { elliottTokens } from '../../theme/elliottTheme';

type Shift = {
  team: string;
  person: string;
  handle: string;
  until: string;
};

const SHIFTS: Shift[] = [
  { team: 'platform-core',       person: 'Devi Patel',     handle: '@dpatel',   until: 'Tue 09:00' },
  { team: 'checkout-api',        person: 'Jonas Weiß',     handle: '@jweiss',   until: 'Mon 18:00' },
  { team: 'growth-experiments',  person: 'Aiyana Tsosie',  handle: '@atsosie',  until: 'Wed 09:00' },
  { team: 'data-pipelines',      person: 'Henri Lefebvre', handle: '@hlefebvre',until: 'Fri 17:00' },
];

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
    padding: '12px 16px',
    borderBottom: `1px solid ${elliottTokens.border}`,
    '&:last-child': { borderBottom: 'none' },
  },
  topLine: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  team: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: elliottTokens.accent,
  },
  until: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: elliottTokens.mute,
  },
  bottomLine: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
  },
  handle: { color: elliottTokens.mute, fontFamily: '"JetBrains Mono", ui-monospace, monospace' },
}));

export const OnCallNow = () => {
  const classes = useStyles();
  return (
    <div className={classes.card}>
      <div className={classes.header}>
        <div className={classes.title}>On-call now</div>
        <span className={classes.liveDot}>
          <span className={classes.dot} /> Live
        </span>
      </div>
      {SHIFTS.map(s => (
        <div key={s.team} className={classes.row}>
          <div className={classes.topLine}>
            <span className={classes.team}>{s.team}</span>
            <span className={classes.until}>until {s.until}</span>
          </div>
          <div className={classes.bottomLine}>
            <span>{s.person}</span>
            <span className={classes.handle}>{s.handle}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
