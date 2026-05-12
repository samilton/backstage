// packages/app/src/modules/layout/CustomPageLayout.tsx
//
// Replacement for the frontend-system PageLayout swappable component.
// The default layout renders a plain stock header for every PageBlueprint
// (`Catalog`, `Create`, etc.). Most of this app owns its own custom hero
// inside page content, so those stock banners look duplicated. Keep the
// default-ish header for pages that still need it, but hide it for the
// pages we've restyled.

import { ReactNode, useMemo } from 'react';
import { Link, useResolvedPath } from 'react-router-dom';
import { makeStyles } from '@material-ui/core/styles';
import type { PageLayoutProps } from '@backstage/frontend-plugin-api';
import { appTokens } from '../theme/appTheme';

const HIDE_STOCK_HEADER_FOR = new Set(['Catalog', 'Create']);

const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
    background: appTokens.bg,
  },
  header: {
    borderBottom: `1px solid ${appTokens.borderHard}`,
    background: appTokens.surface,
    flexShrink: 0,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 24px 8px',
    fontSize: 18,
    fontWeight: 500,
    color: appTokens.ink,
  },
  titleLink: {
    color: 'inherit',
    textDecoration: 'none',
  },
  headerActions: {
    marginLeft: 'auto',
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  tabs: {
    display: 'flex',
    gap: 4,
    padding: '0 24px',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 12px',
    textDecoration: 'none',
    color: appTokens.ink2,
    borderBottom: '2px solid transparent',
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontWeight: 600,
    '&:hover': {
      color: appTokens.ink,
      background: appTokens.surface2,
    },
  },
  content: {
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr)',
    gridTemplateAreas: '"pageHeader" "pageContent"',
    flexGrow: 1,
    minHeight: 0,
    background: appTokens.bg,
  },
  // Fallback for pages that don't use our pageHeader/pageContent grid
  // areas internally. The grid still lays them out in source order.
  looseContent: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
    background: appTokens.bg,
  },
}));

const hasRenderableActions = (actions?: Array<ReactNode | null>) =>
  !!actions?.some(Boolean);

export const CustomPageLayout = ({
  title,
  icon,
  noHeader,
  titleLink,
  headerActions,
  tabs,
  children,
}: PageLayoutProps) => {
  const classes = useStyles();
  const hideForRestyledPage = !!title && HIDE_STOCK_HEADER_FOR.has(title);
  const hideStockHeader = noHeader || hideForRestyledPage;
  const showHeader = !hideStockHeader && (title || (tabs && tabs.length > 0));

  const parentPath = useResolvedPath('.').pathname.replace(/\/$/, '');
  const resolvedTabs = useMemo(
    () =>
      tabs?.map(tab => ({
        ...tab,
        href: tab.href.startsWith('/')
          ? tab.href
          : `${parentPath}/${tab.href}`.replace(/\/{2,}/g, '/'),
      })),
    [tabs, parentPath],
  );

  // Only the pages we've explicitly restyled (`Catalog`, `Create`) get
  // the pageHeader/pageContent grid container. Other noHeader pages, such
  // as catalog entity detail pages, often render their own Backstage <Page>
  // internally and should keep normal flex layout.
  const contentClass = hideForRestyledPage ? classes.content : classes.looseContent;

  return (
    <div data-component="page-layout" className={classes.root}>
      {showHeader && (
        <header className={classes.header}>
          {title && (
            <div className={classes.titleRow}>
              {icon}
              {titleLink ? (
                <Link to={titleLink} className={classes.titleLink}>
                  {title}
                </Link>
              ) : (
                title
              )}
              {hasRenderableActions(headerActions) && (
                <div className={classes.headerActions}>{headerActions}</div>
              )}
            </div>
          )}
          {resolvedTabs && resolvedTabs.length > 0 && (
            <nav className={classes.tabs}>
              {resolvedTabs.map(tab => (
                <a key={tab.id} href={tab.href} className={classes.tab}>
                  {tab.icon}
                  {tab.label}
                </a>
              ))}
            </nav>
          )}
        </header>
      )}
      <div className={contentClass}>{children}</div>
    </div>
  );
};
