// packages/app/src/modules/entity/EntityPageHeader.tsx
//
// Drop-in replacement for Backstage's default <EntityHeader>. Layout:
//   ┌──────────────────────────────────────────────────────────────────┐
//   │ // CATALOG / COMPONENT                              [pill] [CTA] │
//   │ checkout-api                                                     │
//   │ Server-side checkout orchestration · Tier 1 · Go                 │
//   └──────────────────────────────────────────────────────────────────┘
//
// Status pill is currently driven by `syntheticHealth(name)` so the demo
// stays stable per entity. Swap to real Datadog signal when the
// service-status backend lands (see docs/design/service-status-widget.md).

import { Link } from 'react-router-dom';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import { useAsyncEntity } from '@backstage/plugin-catalog-react';
import { appTokens } from '../theme/appTheme';
import {
  syntheticHealth,
  entityTier,
  entityLang,
  Health,
} from '../home/widgets/syntheticHealth';

const useStyles = makeStyles(() => ({
  hero: {
    // BackstagePage is a CSS grid with named areas; the header must claim
    // `pageHeader` or it auto-places into `pageNav` and shoves the content
    // sideways.
    gridArea: 'pageHeader',
    width: '100%',
    background: appTokens.bannerCat,
    borderBottom: `1px solid ${appTokens.borderHard}`,
    padding: '24px 28px 20px',
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
  kickerLink: { color: 'inherit', textDecoration: 'none', '&:hover': { color: appTokens.ink } },
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
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  pill: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontWeight: 600,
    padding: '5px 10px',
    border: `1px solid ${appTokens.borderHard}`,
    background: appTokens.surface,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  pillSwatch: { width: 8, height: 8, display: 'inline-block' },
  cta: {
    backgroundColor: appTokens.accent,
    color: appTokens.accentInk,
    padding: '8px 14px',
    fontWeight: 600,
    boxShadow: 'none',
    '&:hover': { backgroundColor: '#b9e34d', boxShadow: 'none' },
  },
}));

const STATUS_COLOR: Record<Health, string> = {
  healthy:  appTokens.ok,
  degraded: appTokens.warn,
  down:     appTokens.bad,
};

const fmtTier = (t: string): string => /^T\d$/i.test(t) ? `Tier ${t.slice(1)}` : t;

export const EntityPageHeader = () => {
  const classes = useStyles();
  const { entity, loading, error } = useAsyncEntity();

  // While the entity is loading or missing, render a hero skeleton with
  // the same height so the layout doesn't jump when it lands.
  if (!entity) {
    return (
      <div className={classes.hero}>
        <div>
          <div className={classes.kicker}>// Catalog</div>
          <h1 className={classes.title}>{loading ? 'Loading…' : error ? 'Error' : '—'}</h1>
          {error && <div className={classes.subtitle}>{error.message}</div>}
        </div>
        <div className={classes.right} />
      </div>
    );
  }

  const name = entity.metadata.name;
  const kind = entity.kind;
  const description = entity.metadata.description ?? '';

  // Subtitle parts: description, tier, lang. Drop blanks.
  const tier = fmtTier(entityTier(entity));
  const lang = entityLang(entity);
  const subtitleParts = [description, tier, lang].filter(Boolean);

  const health = syntheticHealth(name);
  const tone = STATUS_COLOR[health];

  return (
    <div className={classes.hero}>
      <div>
        <div className={classes.kicker}>
          //{' '}
          <Link to="/catalog" className={classes.kickerLink}>Catalog</Link>
          {' / '}
          {kind}
        </div>
        <h1 className={classes.title}>{name}</h1>
        {subtitleParts.length > 0 && (
          <div className={classes.subtitle}>{subtitleParts.join(' · ')}</div>
        )}
      </div>
      <div className={classes.right}>
        <span className={classes.pill} style={{ color: tone }}>
          <span className={classes.pillSwatch} style={{ background: tone }} />
          {health}
        </span>
        <Button
          variant="contained"
          className={classes.cta}
          component={Link}
          to="/create"
        >
          Deploy
        </Button>
      </div>
    </div>
  );
};
