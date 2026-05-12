// packages/app/src/modules/scaffolder/widgets/WizardHero.tsx
// Header for the wizard (sub-page:scaffolder/templates/:ns/:name).
// Mirrors EntityPageHeader: kicker breadcrumb, big title, subtitle.

import { Link } from 'react-router-dom';
import { makeStyles } from '@material-ui/core/styles';
import { appTokens } from '../../theme/appTheme';

const useStyles = makeStyles(() => ({
  hero: {
    margin: '24px 24px 0',
    background: appTokens.bannerCat,
    border: `1px solid ${appTokens.borderHard}`,
    padding: '24px 28px',
  },
  kicker: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: appTokens.ink2,
    marginBottom: 8,
  },
  kickerLink: {
    color: 'inherit',
    textDecoration: 'none',
    '&:hover': { color: appTokens.ink },
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
    maxWidth: 760,
  },
}));

interface WizardHeroProps {
  templateName: string;
  title?: string;
  description?: string;
}

export const WizardHero = ({ templateName, title, description }: WizardHeroProps) => {
  const classes = useStyles();
  return (
    <div className={classes.hero}>
      <div className={classes.kicker}>
        //{' '}
        <Link to="/create" className={classes.kickerLink}>Create</Link>
        {' / Template / '}
        {templateName}
      </div>
      <h1 className={classes.title}>{title ?? templateName}</h1>
      {description && <div className={classes.subtitle}>{description}</div>}
    </div>
  );
};
