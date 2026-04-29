// packages/app/src/modules/k8s/entity/widgets/EntityLogsPlaceholder.tsx
//
// Visual stub for the "Logs · tail -f" panel. Real wiring uses
// kubernetesProxyApiRef.getPodLogs() with periodic re-fetch (or a
// websocket if we ever set one up). Held for a follow-up.

import { makeStyles } from '@material-ui/core/styles';
import { elliottTokens } from '../../../theme/elliottTheme';

const useStyles = makeStyles(() => ({
  card: { background: elliottTokens.surface, border: `1px solid ${elliottTokens.border}` },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', borderBottom: `1px solid ${elliottTokens.border}`,
  },
  title: { fontSize: 13, fontWeight: 600 },
  meta: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: elliottTokens.mute,
  },
  body: {
    padding: '14px 16px',
    color: elliottTokens.mute,
    fontSize: 12.5,
  },
  todo: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: elliottTokens.warn,
    marginRight: 8,
  },
}));

export const EntityLogsPlaceholder = () => {
  const classes = useStyles();
  return (
    <div className={classes.card}>
      <div className={classes.header}>
        <div className={classes.title}>Logs · tail -f</div>
        <div className={classes.meta}>not wired</div>
      </div>
      <div className={classes.body}>
        <span className={classes.todo}>// todo</span>
        Stream pod logs via <code>kubernetesProxyApiRef.getPodLogs()</code> with a per-pod selector.
        Add filter chips for ALL / WARN / ERROR matching log severity. Held until logs UX is designed.
      </div>
    </div>
  );
};
