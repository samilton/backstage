// packages/app/src/modules/k8s/widgets/FleetHero.tsx

import { useRef, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import { appTokens } from '../../theme/appTheme';
import { FleetSummary } from '../clusterFleetApi';

const useStyles = makeStyles(() => ({
  hero: {
    background: appTokens.bannerCat,
    border: `1px solid ${appTokens.borderHard}`,
    padding: '24px 28px',
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    alignItems: 'start',
    gap: 16,
  },
  kicker: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: appTokens.ink2,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: appTokens.ink,
    margin: 0,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13.5,
    color: appTokens.ink2,
  },
  ctx: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    border: `1px solid ${appTokens.borderHard}`,
    background: appTokens.surface,
  },
  menuItem: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 12,
    letterSpacing: '0.04em',
  },
  menuItemMeta: {
    marginLeft: 12,
    color: appTokens.mute,
    fontSize: 10,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
}));

export const FleetHero = ({
  summary,
  selectedCluster,
  onSelectCluster,
}: {
  summary?: FleetSummary;
  selectedCluster?: string;
  onSelectCluster?: (name: string | undefined) => void;
}) => {
  const classes = useStyles();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const clusters = summary?.clusters ?? [];
  const c = summary?.totals.clusters ?? 0;
  const n = summary?.totals.nodes ?? 0;
  const p = summary?.totals.podsRunning ?? 0;

  const buttonLabel = selectedCluster ? `${selectedCluster} ▾` : 'Cluster ▾';

  const select = (name: string | undefined) => {
    onSelectCluster?.(name);
    setOpen(false);
  };

  return (
    <div className={classes.hero}>
      <div>
        <div className={classes.kicker}>// Kubernetes</div>
        <h1 className={classes.title}>Cluster fleet</h1>
        <div className={classes.subtitle}>
          {selectedCluster ? (
            <>scoped to <strong>{selectedCluster}</strong></>
          ) : (
            <>
              {c} cluster{c === 1 ? '' : 's'} · {n} node{n === 1 ? '' : 's'} ·{' '}
              {p.toLocaleString()} pods running
            </>
          )}
        </div>
      </div>
      <Button
        variant="outlined"
        className={classes.ctx}
        ref={anchorRef}
        onClick={() => setOpen(o => !o)}
        disabled={clusters.length === 0}
      >
        {buttonLabel}
      </Button>
      <Menu
        anchorEl={anchorRef.current}
        open={open}
        onClose={() => setOpen(false)}
        getContentAnchorEl={null}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          className={classes.menuItem}
          selected={!selectedCluster}
          onClick={() => select(undefined)}
        >
          All clusters
          <span className={classes.menuItemMeta}>{c}</span>
        </MenuItem>
        {clusters.map(cl => (
          <MenuItem
            key={cl.name}
            className={classes.menuItem}
            selected={cl.name === selectedCluster}
            onClick={() => select(cl.name)}
          >
            {cl.name}
            <span className={classes.menuItemMeta}>{cl.region}</span>
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
};
