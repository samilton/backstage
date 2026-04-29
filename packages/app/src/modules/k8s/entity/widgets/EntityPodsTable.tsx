// packages/app/src/modules/k8s/entity/widgets/EntityPodsTable.tsx

import { makeStyles } from '@material-ui/core/styles';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Button from '@material-ui/core/Button';
import { useRef, useState } from 'react';
import { elliottTokens } from '../../../theme/elliottTheme';
import { PodRow, fmtAge } from '../data';

const useStyles = makeStyles(() => ({
  card: { background: elliottTokens.surface, border: `1px solid ${elliottTokens.border}` },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', borderBottom: `1px solid ${elliottTokens.border}`,
    gap: 12,
  },
  title: { fontSize: 13, fontWeight: 600 },
  cluster: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, color: elliottTokens.mute },
  meta: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
    color: elliottTokens.mute,
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: elliottTokens.mute, background: elliottTokens.surface2,
    padding: '8px 14px', textAlign: 'left', fontWeight: 600,
  },
  td: { padding: '10px 14px', fontSize: 12.5, borderBottom: `1px solid ${elliottTokens.border}` },
  tdMono: { fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 12 },
  status: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6,
  },
  swatch: { width: 8, height: 8, display: 'inline-block' },
  switcher: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase',
    border: `1px solid ${elliottTokens.borderHard}`,
    background: elliottTokens.surface,
    padding: '4px 8px',
  },
  warn: { color: elliottTokens.warn },
}));

const phaseColor = (phase: string, ready: boolean): string => {
  if (phase === 'Running' && ready) return elliottTokens.ok;
  if (phase === 'Pending') return elliottTokens.warn;
  if (phase === 'Failed' || phase === 'Unknown') return elliottTokens.bad;
  if (phase === 'Succeeded') return elliottTokens.mute;
  return elliottTokens.mute;
};

const fmtCpu = (m?: number): string => {
  if (m === undefined) return '—';
  return `${Math.round(m)}m`;
};
const fmtMem = (b?: number): string => {
  if (b === undefined) return '—';
  if (b < 1024 * 1024) return `${Math.round(b / 1024)}Ki`;
  if (b < 1024 * 1024 * 1024) return `${Math.round(b / (1024 * 1024))}Mi`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(1)}Gi`;
};

export const EntityPodsTable = ({
  rows,
  focusCluster,
  onFocusCluster,
  clusters,
}: {
  rows: PodRow[];
  focusCluster?: string;
  onFocusCluster: (name: string) => void;
  clusters: string[];
}) => {
  const classes = useStyles();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const scoped = focusCluster ? rows.filter(r => r.cluster === focusCluster) : rows;
  const ready = scoped.filter(r => r.ready).length;
  const namespace = scoped[0]?.namespace ?? '—';

  return (
    <div className={classes.card}>
      <div className={classes.header}>
        <div className={classes.title}>
          Pods <span className={classes.cluster}>· {focusCluster ?? 'all clusters'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className={classes.meta}>{ready}/{scoped.length} ready · ns {namespace}</span>
          {clusters.length > 1 && (
            <>
              <Button
                ref={anchorRef}
                variant="outlined"
                className={classes.switcher}
                onClick={() => setOpen(o => !o)}
              >
                {focusCluster ?? 'cluster'} ▾
              </Button>
              <Menu
                anchorEl={anchorRef.current}
                open={open}
                onClose={() => setOpen(false)}
                getContentAnchorEl={null}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                {clusters.map(c => (
                  <MenuItem
                    key={c}
                    selected={c === focusCluster}
                    onClick={() => { onFocusCluster(c); setOpen(false); }}
                  >
                    {c}
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
        </div>
      </div>
      <table className={classes.table}>
        <thead>
          <tr>
            <th className={classes.th}>Pod</th>
            <th className={classes.th}>Ready</th>
            <th className={classes.th}>Node</th>
            <th className={classes.th}>Age</th>
            <th className={classes.th}>Restarts</th>
            <th className={classes.th}>CPU</th>
            <th className={classes.th}>Mem</th>
            <th className={classes.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {scoped.length === 0 && (
            <tr><td className={classes.td} colSpan={8} style={{ color: elliottTokens.mute }}>
              No pods.
            </td></tr>
          )}
          {scoped.map(p => {
            const tone = phaseColor(p.phase, p.ready);
            return (
              <tr key={`${p.cluster}/${p.name}`}>
                <td className={`${classes.td} ${classes.tdMono}`}>{p.name}</td>
                <td className={`${classes.td} ${classes.tdMono}`}>{p.containersReady}/{p.containersTotal}</td>
                <td className={`${classes.td} ${classes.tdMono}`}>{p.node}</td>
                <td className={`${classes.td} ${classes.tdMono}`}>{fmtAge(p.ageMs)}</td>
                <td className={`${classes.td} ${classes.tdMono} ${p.restarts > 0 ? classes.warn : ''}`}>{p.restarts}</td>
                <td className={`${classes.td} ${classes.tdMono}`}>{fmtCpu(p.cpuMillicores)}</td>
                <td className={`${classes.td} ${classes.tdMono}`}>{fmtMem(p.memBytes)}</td>
                <td className={classes.td}>
                  <span className={classes.status} style={{ color: tone }}>
                    <span className={classes.swatch} style={{ background: tone }} />
                    {p.phase}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
