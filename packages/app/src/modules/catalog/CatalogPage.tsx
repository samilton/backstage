// packages/app/src/modules/catalog/CatalogPage.tsx
//
// Custom catalog index. This replaces the default catalog index
// page only; entity detail pages still come from @backstage/plugin-catalog
// and keep our EntityPageHeader override.

import { Link } from 'react-router-dom';
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import { CatalogTable } from '@backstage/plugin-catalog';
import {
  CatalogFilterLayout,
  DefaultFilters,
  EntityListProvider,
} from '@backstage/plugin-catalog-react';
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
    maxWidth: 720,
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
  body: {
    background: appTokens.bg,
    padding: '16px 24px 24px',
    minHeight: 0,
    // Keep the catalog filter/table usable while removing the stock
    // Backstage page header around it.
    '& .MuiPaper-root': {
      borderRadius: 0,
    },
    [theme.breakpoints.down('sm')]: {
      padding: 16,
    },
  },
}));

export const CatalogPage = () => {
  const classes = useStyles();

  return (
    <>
      <div className={classes.hero}>
        <div>
          <div className={classes.kicker}>// Catalog</div>
          <h1 className={classes.title}>Find what the platform knows</h1>
          <div className={classes.subtitle}>
            Browse components, APIs, systems, resources, templates and owners.
            The catalog is the source of truth for the portal and the event
            stream that feeds downstream automation.
          </div>
        </div>
        <Button
          variant="outlined"
          className={classes.cta}
          component={Link}
          to="/catalog-import"
        >
          Register existing
        </Button>
      </div>
      <div className={classes.body}>
        <EntityListProvider pagination>
          <CatalogFilterLayout>
            <CatalogFilterLayout.Filters>
              <DefaultFilters initialKind="component" />
            </CatalogFilterLayout.Filters>
            <CatalogFilterLayout.Content>
              <CatalogTable />
            </CatalogFilterLayout.Content>
          </CatalogFilterLayout>
        </EntityListProvider>
      </div>
    </>
  );
};
