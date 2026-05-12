// packages/app/src/modules/scaffolder/TemplateGalleryPage.tsx
// Custom replacement for the default scaffolder gallery
// (sub-page:scaffolder/templates index). Renders:
//
//   ┌ Hero ───────────────────────────────────────────────────────┐
//   │ // CREATE / SCAFFOLD                       N templates  CTA │
//   └─────────────────────────────────────────────────────────────┘
//   ┌ Category strip ─────────────────────────────────────────────┐
//   │ All · service · website · library · docs · pipeline · …    │
//   └─────────────────────────────────────────────────────────────┘
//   ┌ Grid (3 cols) ──────────────────────────────────────────────┐
//   │ TemplateCard … TemplateCard … TemplateCard …                │
//   └─────────────────────────────────────────────────────────────┘
//
// `uses` numbers are still synthetic (no telemetry yet). The category
// strip filters on `spec.type`; templates without a type fall under
// "other".

import { useMemo, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import useAsync from 'react-use/lib/useAsync';
import { appTokens } from '../theme/appTheme';
import { GalleryHero } from './widgets/GalleryHero';
import { TemplateCard, GalleryTemplate } from './widgets/TemplateCard';

const ALL = '__all__';

const useStyles = makeStyles(theme => ({
  body: {
    background: appTokens.bg,
    padding: '16px 24px 24px',
    display: 'grid',
    gap: 18,
    alignContent: 'start',
  },
  strip: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    background: appTokens.surface,
    border: `1px solid ${appTokens.border}`,
    padding: '10px 12px',
  },
  chip: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10.5,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding: '5px 10px',
    border: `1px solid ${appTokens.border}`,
    background: 'transparent',
    color: appTokens.ink2,
    cursor: 'pointer',
    fontWeight: 600,
  },
  chipOn: {
    background: appTokens.ink,
    color: appTokens.surface,
    borderColor: appTokens.ink,
  },
  count: {
    marginLeft: 6,
    color: appTokens.mute,
    fontWeight: 400,
  },
  countOn: { color: appTokens.surface },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    [theme.breakpoints.down('md')]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
    [theme.breakpoints.down('sm')]: { gridTemplateColumns: '1fr' },
    gap: 12,
  },
  empty: {
    textAlign: 'center',
    padding: '48px 0',
    color: appTokens.mute,
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 12,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    background: appTokens.surface,
    border: `1px solid ${appTokens.border}`,
  },
}));

export const TemplateGalleryPage = () => {
  const classes = useStyles();
  const catalogApi = useApi(catalogApiRef);
  const [category, setCategory] = useState<string>(ALL);

  const { value, loading, error } = useAsync(async () => {
    // No `fields` projection — the catalog API's field filter has bitten
    // us before with top-level paths. We're not paginating so the whole
    // entity is fine.
    const { items } = await catalogApi.getEntities({
      filter: { kind: 'Template' },
    });
    return items.map<GalleryTemplate>((e, i) => ({
      name: e.metadata.name,
      namespace: e.metadata.namespace ?? 'default',
      title: (e.metadata as any).title ?? e.metadata.name,
      description: e.metadata.description ?? '',
      tags: e.metadata.tags ?? [],
      type: (e.spec as any)?.type as string | undefined,
      owner: (e.spec as any)?.owner as string | undefined,
      uses: 142 - i * 11, // synthetic, swap when telemetry lands
    }));
  }, [catalogApi]);

  // useMemo so the array identity is stable across renders, otherwise
  // downstream useMemo(categories) deps change every render.
  const templates = useMemo(() => value ?? [], [value]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of templates) {
      const key = t.type || 'other';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [templates]);

  const filtered =
    category === ALL ? templates : templates.filter(t => (t.type || 'other') === category);

  return (
    <>
      <GalleryHero
        templateCount={templates.length}
        categoryCount={categories.length}
        registerHref="/catalog-import"
      />
      <div className={classes.body}>
        <div className={classes.strip}>
          <button
            type="button"
            className={`${classes.chip} ${category === ALL ? classes.chipOn : ''}`}
            onClick={() => setCategory(ALL)}
          >
            All
            <span className={`${classes.count} ${category === ALL ? classes.countOn : ''}`}>
              {templates.length}
            </span>
          </button>
          {categories.map(([cat, n]) => {
            const on = category === cat;
            return (
              <button
                key={cat}
                type="button"
                className={`${classes.chip} ${on ? classes.chipOn : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
                <span className={`${classes.count} ${on ? classes.countOn : ''}`}>{n}</span>
              </button>
            );
          })}
        </div>

        {loading && <div className={classes.empty}>Loading templates…</div>}
        {error && <div className={classes.empty}>Failed to load: {error.message}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className={classes.empty}>No templates in this category</div>
        )}
        {filtered.length > 0 && (
          <div className={classes.grid}>
            {filtered.map((t, i) => (
              <TemplateCard key={`${t.namespace}/${t.name}`} template={t} index={i} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};
