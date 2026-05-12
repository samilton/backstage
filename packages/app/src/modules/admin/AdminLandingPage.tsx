// packages/app/src/modules/admin/AdminLandingPage.tsx
//
// Landing page for /admin. Hero + tile grid linking to admin tools.
// Most tiles are stubs today; they'll fill in as the platform team
// builds out admin surfaces (or as we re-enable + restyle the
// scaffolder's own actions/editor/templating-extensions subpages).
//
// The four scaffolder admin SubPages (sub-page:scaffolder/tasks,
// /actions, /editor, /templating-extensions) are disabled in
// app-config.yaml so they don't clutter /create's tab bar. If a
// future admin needs them, the cleanest paths are:
//   a) Re-enable selectively in app-config.yaml (they reappear as
//      tabs at /create), or
//   b) Re-mount their internals here \u2014 but those components
//      (ListTasksPage, ActionsPage, TemplateEditorPage, etc.) live
//      behind private package paths in @backstage/plugin-scaffolder,
//      so importing them is fragile across version bumps.

import { Link } from 'react-router-dom';
import { makeStyles } from '@material-ui/core/styles';
import { appTokens } from '../theme/appTheme';

const useStyles = makeStyles(theme => ({
  hero: {
    margin: '24px 24px 0',
    background: appTokens.bannerCat,
    border: `1px solid ${appTokens.borderHard}`,
    padding: '24px 28px',
    display: 'grid',
    gridTemplateColumns: '1fr auto',
    alignItems: 'end',
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
    maxWidth: 640,
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
    color: appTokens.ink2,
  },
  body: {
    background: appTokens.bg,
    padding: '16px 24px 24px',
    display: 'grid',
    gap: 18,
    alignContent: 'start',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    [theme.breakpoints.down('md')]: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
    [theme.breakpoints.down('sm')]: { gridTemplateColumns: '1fr' },
    gap: 12,
  },
  tile: {
    background: appTokens.surface,
    border: `1px solid ${appTokens.border}`,
    padding: '16px 18px',
    display: 'grid',
    gap: 8,
    alignContent: 'start',
    textDecoration: 'none',
    color: 'inherit',
    '&:hover': {
      borderColor: appTokens.borderHard,
      background: appTokens.surface2,
    },
  },
  tileDisabled: {
    cursor: 'not-allowed',
    opacity: 0.55,
    '&:hover': {
      borderColor: appTokens.border,
      background: appTokens.surface,
    },
  },
  tileKicker: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: appTokens.accent,
    fontWeight: 600,
  },
  tileTitle: { fontSize: 15, fontWeight: 600, color: appTokens.ink },
  tileDesc: { fontSize: 12.5, color: appTokens.ink2, lineHeight: 1.45 },
  tileCta: {
    marginTop: 4,
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: appTokens.accent,
    fontWeight: 600,
  },
}));

interface Tile {
  kicker: string;
  title: string;
  description: string;
  href?: string;
  cta?: string;
}

const TILES: Tile[] = [
  {
    kicker: '01',
    title: 'Scaffolder tasks',
    description:
      'Recent template runs across the org. Watch logs, retry failures, see who provisioned what.',
    cta: 'Coming soon',
  },
  {
    kicker: '02',
    title: 'Scaffolder actions',
    description:
      'Catalogue of every action template authors can use (catalog:write, fetch:template, github:repo:create, …).',
    cta: 'Coming soon',
  },
  {
    kicker: '03',
    title: 'Template editor',
    description:
      'Author and dry-run new scaffolder templates against the live action set.',
    cta: 'Coming soon',
  },
  {
    kicker: '04',
    title: 'Templating extensions',
    description:
      'Reference for nunjucks filters and globals available inside templates.',
    cta: 'Coming soon',
  },
  {
    kicker: '05',
    title: 'Create NSQ topic',
    description:
      'Demo: form → CloudEvent on ops.requests → ops-controller → Temporal workflow → nsqd /topic/create. End-to-end Backstage ↔ NSQ ↔ Temporal.',
    href: '/admin/topics/new',
    cta: 'Open form',
  },
  {
    kicker: '06',
    title: 'Permission policy',
    description:
      'Inspect the OPA policy decisions powering this admin gate. Replay decisions, simulate roles.',
    cta: 'Coming soon',
  },
];

export const AdminLandingPage = () => {
  const classes = useStyles();
  return (
    <>
      <div className={classes.hero}>
        <div>
          <div className={classes.kicker}>// Admin</div>
          <h1 className={classes.title}>Platform admin</h1>
          <div className={classes.subtitle}>
            Tools for running the developer portal itself. Visibility of this
            menu is policy-gated — today the gate is open; once the OPA
            integration lands it will check{' '}
            <code>admin.area.read</code> against the caller's groups.
          </div>
        </div>
        <div className={classes.pill}>access: open</div>
      </div>
      <div className={classes.body}>
        <div className={classes.grid}>
          {TILES.map(t => {
            const className = `${classes.tile}${t.href ? '' : ` ${classes.tileDisabled}`}`;
            const inner = (
              <>
                <div className={classes.tileKicker}>{t.kicker}</div>
                <div className={classes.tileTitle}>{t.title}</div>
                <div className={classes.tileDesc}>{t.description}</div>
                <div className={classes.tileCta}>{t.cta ?? 'Open ▸'}</div>
              </>
            );
            return t.href ? (
              <Link key={t.title} to={t.href} className={className}>
                {inner}
              </Link>
            ) : (
              <div key={t.title} className={className}>
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
