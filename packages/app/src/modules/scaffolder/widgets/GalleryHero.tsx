// packages/app/src/modules/scaffolder/widgets/GalleryHero.tsx
// Hero strip for the /create gallery. Mirrors the home / kubernetes hero
// pattern: mono kicker, big title, supporting copy on the left; right side
// is a stat cluster + register-existing CTA.

import { Link } from 'react-router-dom';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import { appTokens } from '../../theme/appTheme';

const useStyles = makeStyles(() => ({
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
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
  },
  stat: {
    textAlign: 'right',
  },
  statNum: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 22,
    fontWeight: 600,
    color: appTokens.ink,
    lineHeight: 1,
  },
  statLabel: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: appTokens.mute,
    marginTop: 4,
  },
  cta: {
    backgroundColor: appTokens.surface,
    color: appTokens.ink,
    border: `1px solid ${appTokens.borderHard}`,
    padding: '8px 14px',
    fontWeight: 600,
    boxShadow: 'none',
    '&:hover': { backgroundColor: appTokens.surface2, boxShadow: 'none' },
  },
}));

interface GalleryHeroProps {
  templateCount: number;
  categoryCount: number;
  registerHref?: string;
}

export const GalleryHero = ({ templateCount, categoryCount, registerHref }: GalleryHeroProps) => {
  const classes = useStyles();
  return (
    <div className={classes.hero}>
      <div>
        <div className={classes.kicker}>// Create / Scaffold</div>
        <h1 className={classes.title}>Spin up something new</h1>
        <div className={classes.subtitle}>
          Pick a template to scaffold a service, library, pipeline or docs site.
          Each template lands a real repo wired up to CI, observability and the
          catalog.
        </div>
      </div>
      <div className={classes.right}>
        <div className={classes.stat}>
          <div className={classes.statNum}>{templateCount}</div>
          <div className={classes.statLabel}>Templates</div>
        </div>
        <div className={classes.stat}>
          <div className={classes.statNum}>{categoryCount}</div>
          <div className={classes.statLabel}>Categories</div>
        </div>
        {registerHref && (
          <Button
            variant="outlined"
            className={classes.cta}
            component={Link}
            to={registerHref}
          >
            Register existing
          </Button>
        )}
      </div>
    </div>
  );
};
