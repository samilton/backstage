// packages/app/src/modules/home/widgets/ServiceStatsRow.tsx
// 4 stat cards: Healthy / Degraded / Down / Deploys 24h.
//
// Healthy/degraded/down counts are derived from the catalog (kind=Component)
// using a deterministic synthetic health hash so the demo stays stable across
// reloads. Deploys/24h is a placeholder — wire to a CI plugin later.

import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import useAsync from 'react-use/lib/useAsync';
import { makeStyles } from '@material-ui/core/styles';
import { elliottTokens } from '../../theme/elliottTheme';
import { syntheticHealth } from './syntheticHealth';

const useStyles = makeStyles(() => ({
  row: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 16,
  },
  card: {
    background: elliottTokens.surface,
    border: `1px solid ${elliottTokens.border}`,
    padding: '16px 18px',
  },
  label: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: elliottTokens.mute,
    marginBottom: 8,
  },
  value: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 36,
    fontWeight: 600,
    lineHeight: 1,
    marginBottom: 8,
  },
  detail: {
    fontSize: 12,
    color: elliottTokens.ink2,
  },
  ok:   { color: elliottTokens.ok },
  warn: { color: elliottTokens.warn },
  bad:  { color: elliottTokens.bad },
}));

export const ServiceStatsRow = () => {
  const classes = useStyles();
  const catalogApi = useApi(catalogApiRef);

  const { value } = useAsync(async () => {
    const { items } = await catalogApi.getEntities({
      filter: { kind: 'Component' },
      fields: ['metadata.name', 'kind'],
    });
    let healthy = 0, degraded = 0, down = 0;
    let firstDegraded: string | undefined;
    let firstDown: string | undefined;
    for (const e of items) {
      const h = syntheticHealth(e.metadata.name);
      if (h === 'healthy') healthy++;
      else if (h === 'degraded') {
        degraded++;
        firstDegraded = firstDegraded ?? e.metadata.name;
      } else {
        down++;
        firstDown = firstDown ?? e.metadata.name;
      }
    }
    return { total: items.length, healthy, degraded, down, firstDegraded, firstDown };
  }, [catalogApi]);

  const stats = value ?? { total: 0, healthy: 0, degraded: 0, down: 0 };
  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className={classes.row}>
      <Stat label="Healthy services"  value={pad(stats.healthy)}  detail={`of ${stats.total}`}                tone="ok"   />
      <Stat label="Degraded"          value={pad(stats.degraded)} detail={value?.firstDegraded ?? '—'}        tone="warn" />
      <Stat label="Down"              value={pad(stats.down)}     detail={value?.firstDown ?? '—'}            tone="bad"  />
      <Stat label="Deploys / 24h"     value="47"                  detail="+12 vs avg"                          tone="plain" />
    </div>
  );
};

const Stat = ({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: 'ok' | 'warn' | 'bad' | 'plain';
}) => {
  const classes = useStyles();
  const toneClass =
    tone === 'ok' ? classes.ok :
    tone === 'warn' ? classes.warn :
    tone === 'bad' ? classes.bad : '';
  return (
    <div className={classes.card}>
      <div className={classes.label}>{label}</div>
      <div className={`${classes.value} ${toneClass}`}>{value}</div>
      <div className={classes.detail}>{detail}</div>
    </div>
  );
};
