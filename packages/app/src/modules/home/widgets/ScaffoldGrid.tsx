// packages/app/src/modules/home/widgets/ScaffoldGrid.tsx
// "Scaffold something new" — live Template entities from the catalog.
// Falls back to a small placeholder set if no templates are registered yet.

import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import useAsync from 'react-use/lib/useAsync';
import { makeStyles } from '@material-ui/core/styles';
import { appTokens } from '../../theme/appTheme';

type Tmpl = { name: string; title: string; description: string; tagsLine: string; uses: number };

const PLACEHOLDERS: Tmpl[] = [
  { name: 'go-grpc-service', title: 'Go gRPC service',    description: 'Buf, OTel, Postgres, Helm',          tagsLine: '',                 uses: 142 },
  { name: 'nextjs-app',      title: 'Next.js app',        description: 'TS, Tailwind, auth, Vercel preview', tagsLine: '',                 uses: 96  },
  { name: 'python-pipeline', title: 'Python data pipeline', description: 'Airflow DAG, dbt, Snowflake',     tagsLine: '',                 uses: 34  },
  { name: 'rust-worker',     title: 'Rust worker',        description: 'Tokio, NATS, Prometheus',           tagsLine: '',                 uses: 21  },
  { name: 'docs-site',       title: 'Docs site',          description: 'MDX, search, redirects',            tagsLine: '',                 uses: 58  },
  { name: 'mobile-feature',  title: 'Mobile feature module', description: 'iOS+Android shared, KMP',        tagsLine: '',                 uses: 12  },
];

const useStyles = makeStyles(theme => ({
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
  meta: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: appTokens.mute,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
    [theme.breakpoints.down('md')]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
  },
  cell: {
    padding: '14px 16px',
    borderRight: `1px solid ${appTokens.border}`,
    '&:last-child': { borderRight: 'none' },
    display: 'grid',
    gap: 8,
    alignContent: 'start',
  },
  cellHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  num: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    color: appTokens.accent,
    letterSpacing: '0.08em',
  },
  uses: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    color: appTokens.mute,
  },
  tmplTitle: { fontSize: 14, fontWeight: 600 },
  desc: { fontSize: 12, color: appTokens.ink2, lineHeight: 1.4 },
  use: {
    marginTop: 4,
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: appTokens.accent,
    textDecoration: 'none',
  },
}));

export const ScaffoldGrid = () => {
  const classes = useStyles();
  const catalogApi = useApi(catalogApiRef);

  const { value } = useAsync(async () => {
    try {
      const { items } = await catalogApi.getEntities({
        filter: { kind: 'Template' },
        fields: ['metadata.name', 'metadata.title', 'metadata.description', 'metadata.tags'],
        limit: 6,
      });
      return items.map<Tmpl>((e, i) => ({
        name: e.metadata.name,
        title: (e.metadata as any).title ?? e.metadata.name,
        description: e.metadata.description ?? '',
        tagsLine: (e.metadata.tags ?? []).join(', '),
        uses: 100 - i * 13, // synthetic until you wire real telemetry
      }));
    } catch {
      return [];
    }
  }, [catalogApi]);

  const templates = (value && value.length > 0) ? value : PLACEHOLDERS;
  const shown = templates.slice(0, 6);

  return (
    <div className={classes.card}>
      <div className={classes.header}>
        <div className={classes.title}>Scaffold something new</div>
        <div className={classes.meta}>{templates.length} templates</div>
      </div>
      <div className={classes.grid}>
        {shown.map((t, i) => (
          <div key={t.name} className={classes.cell}>
            <div className={classes.cellHead}>
              <span className={classes.num}>{String(i + 1).padStart(2, '0')}</span>
              <span className={classes.uses}>×{t.uses}</span>
            </div>
            <div className={classes.tmplTitle}>{t.title}</div>
            <div className={classes.desc}>{t.description || t.tagsLine || '—'}</div>
            <a className={classes.use} href={`/create/templates/default/${t.name}`}>Use ▸</a>
          </div>
        ))}
      </div>
    </div>
  );
};
