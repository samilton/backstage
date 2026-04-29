// packages/app/src/modules/k8s/ClusterFleetPage.tsx

import { makeStyles } from '@material-ui/core/styles';
import { FleetHero } from './widgets/FleetHero';
import { FleetStatsRow } from './widgets/FleetStatsRow';
import { ClustersTable } from './widgets/ClustersTable';
import { TopNamespaces } from './widgets/TopNamespaces';
import { FleetEvents } from './widgets/FleetEvents';
import { useFleet } from './useFleet';

const useStyles = makeStyles(theme => ({
  page: {
    padding: 24,
    display: 'grid',
    gap: 16,
  },
  midRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.3fr)',
    gap: 16,
    [theme.breakpoints.down('md')]: {
      gridTemplateColumns: '1fr',
    },
  },
}));

export const ClusterFleetPage = () => {
  const classes = useStyles();
  const fleet = useFleet();
  return (
    <div className={classes.page}>
      <FleetHero
        summary={fleet.summary}
        selectedCluster={fleet.selectedCluster}
        onSelectCluster={fleet.selectCluster}
      />
      <FleetStatsRow
        summary={fleet.summary}
        selectedCluster={fleet.selectedCluster}
      />
      <ClustersTable
        summary={fleet.summary}
        selectedCluster={fleet.selectedCluster}
        onSelectCluster={fleet.selectCluster}
      />
      <div className={classes.midRow}>
        <TopNamespaces cluster={fleet.focusCluster} rows={fleet.namespaces} />
        <FleetEvents
          events={fleet.events}
          selectedCluster={fleet.selectedCluster}
        />
      </div>
    </div>
  );
};
