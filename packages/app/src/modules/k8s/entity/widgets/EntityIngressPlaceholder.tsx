// packages/app/src/modules/k8s/entity/widgets/EntityIngressPlaceholder.tsx
//
// Visual stub for the "Ingress · Gateway API" panel. Wiring real data
// requires walking Gateway API CRDs (Gateway, HTTPRoute) which is a
// separate journey — see the design notes when we get to it.

import { makeStyles } from '@material-ui/core/styles';
import { appTokens } from '../../../theme/appTheme';

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
  body: {
    padding: '14px 16px',
    color: appTokens.mute,
    fontSize: 12.5,
  },
  todo: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: appTokens.warn,
    marginRight: 8,
  },
}));

export const EntityIngressPlaceholder = () => {
  const classes = useStyles();
  return (
    <div className={classes.card}>
      <div className={classes.header}>
        <div className={classes.title}>Ingress · Gateway API</div>
        <div className={classes.meta}>not wired</div>
      </div>
      <div className={classes.body}>
        <span className={classes.todo}>// todo</span>
        Walk Gateway / HTTPRoute / Service custom resources scoped to this entity. Plumb via{' '}
        <code>kubernetes.customResources</code> in <code>app-config.yaml</code>, then surface here.
      </div>
    </div>
  );
};
