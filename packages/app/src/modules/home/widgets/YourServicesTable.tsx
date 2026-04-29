// packages/app/src/modules/home/widgets/YourServicesTable.tsx
// "Your services" — live catalog data, kind=Component.
//
// In a real install you'd filter by `spec.owner` matching the current user's
// ownership entity refs (from identityApi.getBackstageIdentity().ownershipEntityRefs).
// For demo simplicity we list the first 7 components and synthesise a status
// column. Owner column strips the `group:`/`user:` ref prefix.

import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import useAsync from 'react-use/lib/useAsync';
import { makeStyles } from '@material-ui/core/styles';
import { elliottTokens } from '../../theme/elliottTheme';
import { syntheticHealth, entityTier, entityLang, Health } from './syntheticHealth';

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
  meta: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: elliottTokens.mute,
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: elliottTokens.mute,
    background: elliottTokens.surface2,
    padding: '8px 14px',
    textAlign: 'left',
    fontWeight: 600,
  },
  td: {
    padding: '10px 14px',
    fontSize: 12.5,
    borderBottom: `1px solid ${elliottTokens.border}`,
  },
  status: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  swatch: { width: 8, height: 8, display: 'inline-block' },
}));

const stripRef = (s?: string) => s?.replace(/^[^:]+:(default\/)?/, '') ?? '—';

const STATUS_COLOR: Record<Health, string> = {
  healthy:  elliottTokens.ok,
  degraded: elliottTokens.warn,
  down:     elliottTokens.bad,
};

export const YourServicesTable = () => {
  const classes = useStyles();
  const catalogApi = useApi(catalogApiRef);

  const { value, loading } = useAsync(async () => {
    const { items } = await catalogApi.getEntities({
      filter: { kind: 'Component' },
      fields: [
        'metadata.name',
        'metadata.annotations',
        'spec.owner',
        'spec.type',
        'spec.lifecycle',
      ],
      limit: 7,
    });
    return items;
  }, [catalogApi]);

  const rows = value ?? [];

  return (
    <div className={classes.card}>
      <div className={classes.header}>
        <div className={classes.title}>Your services</div>
        <div className={classes.meta}>owned · {rows.length}</div>
      </div>
      <table className={classes.table}>
        <thead>
          <tr>
            <th className={classes.th}>Name</th>
            <th className={classes.th}>Owner</th>
            <th className={classes.th}>Tier</th>
            <th className={classes.th}>Lang</th>
            <th className={classes.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {!loading && rows.length === 0 && (
            <tr>
              <td className={classes.td} colSpan={5} style={{ color: elliottTokens.mute }}>
                No components in the catalog yet — add one under <code>examples/</code>.
              </td>
            </tr>
          )}
          {rows.map(e => {
            const name = e.metadata.name;
            const health = syntheticHealth(name);
            return (
              <tr key={name}>
                <td className={classes.td}>{name}</td>
                <td className={classes.td}>{stripRef((e.spec as any)?.owner)}</td>
                <td className={classes.td}>{entityTier(e)}</td>
                <td className={classes.td}>{entityLang(e)}</td>
                <td className={classes.td}>
                  <span className={classes.status} style={{ color: STATUS_COLOR[health] }}>
                    <span className={classes.swatch} style={{ background: STATUS_COLOR[health] }} />
                    {health}
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
