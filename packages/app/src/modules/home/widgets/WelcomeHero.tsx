// packages/app/src/modules/home/widgets/WelcomeHero.tsx
// "// ELLIOTT · INTERNAL DEVELOPER PLATFORM" kicker + welcome heading + date.

import { useApi, identityApiRef } from '@backstage/core-plugin-api';
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import useAsync from 'react-use/lib/useAsync';
import { elliottTokens } from '../../theme/elliottTheme';

const useStyles = makeStyles(() => ({
  hero: {
    background: elliottTokens.bannerHome,
    border: `1px solid ${elliottTokens.borderHard}`,
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
    color: elliottTokens.ink2,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: elliottTokens.ink,
    margin: 0,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13.5,
    color: elliottTokens.ink2,
  },
  cta: {
    background: elliottTokens.accent,
    color: elliottTokens.accentInk,
    padding: '8px 14px',
    fontWeight: 600,
    boxShadow: 'none',
    '&:hover': { background: '#b9e34d', boxShadow: 'none' },
  },
}));

const formatDate = (d: Date) =>
  d.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const firstName = (display: string | undefined, ref: string): string => {
  if (display) return display.split(' ')[0];
  // identity ref looks like "user:default/mara" — pull the name part
  const slug = ref.split('/').pop() ?? 'there';
  return slug.charAt(0).toUpperCase() + slug.slice(1);
};

export const WelcomeHero = () => {
  const classes = useStyles();
  const identityApi = useApi(identityApiRef);

  const { value } = useAsync(async () => {
    const [profile, identity] = await Promise.all([
      identityApi.getProfileInfo(),
      identityApi.getBackstageIdentity(),
    ]);
    return { profile, identity };
  }, [identityApi]);

  const name = firstName(
    value?.profile?.displayName,
    value?.identity?.userEntityRef ?? 'user:default/there',
  );

  return (
    <div className={classes.hero}>
      <div>
        <div className={classes.kicker}>// Elliott · Internal Developer Platform</div>
        <h1 className={classes.title}>Welcome back, {name}</h1>
        <div className={classes.subtitle}>
          {formatDate(new Date())} · most systems nominal
        </div>
      </div>
      <Button variant="contained" className={classes.cta} href="/create">
        + Create
      </Button>
    </div>
  );
};
