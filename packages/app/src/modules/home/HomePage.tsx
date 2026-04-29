// packages/app/src/modules/home/HomePage.tsx
// Elliott home — composes the hero + three rows of widgets.
//
// Layout matches the design mock:
//   ┌─ hero ────────────────────────────────────────────────┐
//   ├─ 4 stat cards ─────────────────────────────────────────┤
//   ├─ services table │ on-call │ recent deploys ───────────┤
//   └─ scaffold templates ───────────────────────────────────┘

import { makeStyles } from '@material-ui/core/styles';
import { WelcomeHero } from './widgets/WelcomeHero';
import { ServiceStatsRow } from './widgets/ServiceStatsRow';
import { YourServicesTable } from './widgets/YourServicesTable';
import { OnCallNow } from './widgets/OnCallNow';
import { RecentDeploys } from './widgets/RecentDeploys';
import { ScaffoldGrid } from './widgets/ScaffoldGrid';

const useStyles = makeStyles(theme => ({
  page: {
    padding: 24,
    display: 'grid',
    gap: 16,
  },
  midRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr)',
    gap: 16,
    [theme.breakpoints.down('md')]: {
      gridTemplateColumns: '1fr',
    },
  },
}));

export const HomePage = () => {
  const classes = useStyles();
  return (
    <div className={classes.page}>
      <WelcomeHero />
      <ServiceStatsRow />
      <div className={classes.midRow}>
        <YourServicesTable />
        <OnCallNow />
        <RecentDeploys />
      </div>
      <ScaffoldGrid />
    </div>
  );
};
