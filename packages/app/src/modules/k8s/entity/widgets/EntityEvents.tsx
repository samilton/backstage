// packages/app/src/modules/k8s/entity/widgets/EntityEvents.tsx
//
// Per-entity events. We fetch namespace-scoped events per cluster
// (via kubernetesApiRef.proxy) and filter to involved-objects matching
// the pods/deployments returned by getObjectsByEntity.

import { useApi } from '@backstage/core-plugin-api';
import { kubernetesApiRef } from '@backstage/plugin-kubernetes-react';
import useAsync from 'react-use/lib/useAsync';
import { useState, useMemo } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import type { ObjectsByEntityResponse } from '@backstage/plugin-kubernetes-common';
import { appTokens } from '../../../theme/appTheme';
import { podsIn, deploysIn } from '../data';

const useStyles = makeStyles(() => ({
  card: { background: appTokens.surface, border: `1px solid ${appTokens.border}` },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', borderBottom: `1px solid ${appTokens.border}`,
  },
  title: { fontSize: 13, fontWeight: 600 },
  filterRow: { display: 'flex', gap: 6 },
  chip: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
    padding: '3px 8px', cursor: 'pointer', userSelect: 'none',
    border: `1px solid ${appTokens.borderHard}`,
    background: appTokens.surface,
    color: appTokens.mute,
  },
  chipOn: {
    background: appTokens.ink,
    color: appTokens.surface,
    borderColor: appTokens.ink,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '52px 110px 1fr',
    columnGap: 12,
    padding: '10px 16px',
    borderBottom: `1px solid ${appTokens.border}`,
    alignItems: 'baseline',
    fontSize: 13,
    '&:last-child': { borderBottom: 'none' },
  },
  ago: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 12, color: appTokens.mute,
  },
  reason: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  },
  swatch: { width: 8, height: 8, display: 'inline-block' },
  involved: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11, color: appTokens.ink2,
    marginBottom: 2,
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

type ScopedEvent = {
  id: string;
  cluster: string;
  reason: string;
  type: 'Normal' | 'Warning';
  message: string;
  involvedKind: string;
  involvedName: string;
  occurredAt: string;
};

type Filter = 'all' | 'warning' | 'normal';

type K8sEvent = {
  metadata?: { uid?: string };
  type?: 'Normal' | 'Warning';
  reason?: string;
  message?: string;
  involvedObject?: { kind?: string; name?: string };
  lastTimestamp?: string;
  eventTime?: string;
  firstTimestamp?: string;
};

export const EntityEvents = ({
  k8sId: _k8sId,
  response,
}: {
  k8sId: string;
  response?: ObjectsByEntityResponse;
}) => {
  const classes = useStyles();
  const k8s = useApi(kubernetesApiRef);
  const [filter, setFilter] = useState<Filter>('all');

  // Build the (cluster, namespace, names-of-interest) tuples to query.
  const targets = useMemo(() => {
    if (!response) return [];
    const out: Array<{ cluster: string; namespace: string; names: Set<string> }> = [];
    for (const c of response.items) {
      const names = new Set<string>();
      for (const p of podsIn(c)) {
        if (p.metadata?.name) names.add(p.metadata.name);
      }
      for (const d of deploysIn(c)) {
        if (d.metadata?.name) names.add(d.metadata.name);
      }
      const namespace = podsIn(c)[0]?.metadata?.namespace
        ?? deploysIn(c)[0]?.metadata?.namespace;
      if (namespace) out.push({ cluster: c.cluster.name, namespace, names });
    }
    return out;
  }, [response]);

  const { value: events } = useAsync(async (): Promise<ScopedEvent[]> => {
    const all: ScopedEvent[] = [];
    await Promise.all(targets.map(async t => {
      try {
        const res = await k8s.proxy({
          clusterName: t.cluster,
          path: `/api/v1/namespaces/${t.namespace}/events?limit=200`,
        });
        if (!res.ok) return;
        const data = await res.json() as { items: K8sEvent[] };
        for (const e of data.items) {
          const involvedName = e.involvedObject?.name ?? '';
          if (!t.names.has(involvedName)) continue;
          const occurredAt = e.eventTime ?? e.lastTimestamp ?? e.firstTimestamp;
          if (!occurredAt) continue;
          all.push({
            id: `${t.cluster}/${e.metadata?.uid ?? `${involvedName}-${occurredAt}`}`,
            cluster: t.cluster,
            reason: e.reason ?? 'Event',
            type: e.type ?? 'Normal',
            message: e.message ?? '',
            involvedKind: e.involvedObject?.kind ?? '',
            involvedName,
            occurredAt,
          });
        }
      } catch {
        // skip clusters that error
      }
    }));
    all.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
    return all.slice(0, 30);
  }, [k8s, JSON.stringify(targets.map(t => `${t.cluster}/${t.namespace}/${[...t.names].join(',')}`))]);

  const list = events ?? [];
  const shown = list.filter(e =>
    filter === 'all' || (filter === 'warning' ? e.type === 'Warning' : e.type === 'Normal'),
  );

  return (
    <div className={classes.card}>
      <div className={classes.header}>
        <div className={classes.title}>Events</div>
        <div className={classes.filterRow}>
          <Chip on={filter === 'all'}     onClick={() => setFilter('all')}>All</Chip>
          <Chip on={filter === 'warning'} onClick={() => setFilter('warning')}>Warning</Chip>
          <Chip on={filter === 'normal'}  onClick={() => setFilter('normal')}>Normal</Chip>
        </div>
      </div>
      {shown.length === 0 && (
        <div className={classes.empty}>No events match.</div>
      )}
      {shown.map(e => {
        const tone = e.type === 'Warning' ? appTokens.warn : appTokens.ok;
        return (
          <div key={e.id} className={classes.row}>
            <span className={classes.ago}>{ago(e.occurredAt)}</span>
            <span className={classes.reason} style={{ color: tone }}>
              <span className={classes.swatch} style={{ background: tone }} />
              {e.reason}
            </span>
            <span>
              <span className={classes.involved}>
                {e.involvedKind.toLowerCase()}/{e.involvedName} · {e.cluster}
              </span>
              <span className={classes.message}>{e.message}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
};

const Chip = ({
  on,
  onClick,
  children,
}: { on: boolean; onClick: () => void; children: React.ReactNode }) => {
  const classes = useStyles();
  return (
    <span className={`${classes.chip} ${on ? classes.chipOn : ''}`} onClick={onClick}>
      {children}
    </span>
  );
};
