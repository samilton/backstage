// packages/app/src/modules/home/widgets/OutstandingPrs.tsx
// Mocked GitHub pull request queue. Replace with GitHub Search/GraphQL later.

import { makeStyles } from '@material-ui/core/styles';
import { appTokens } from '../../theme/appTheme';

type PullRequest = {
  repo: string;
  title: string;
  author: string;
  age: string;
  checks: 'green' | 'pending' | 'failing';
  reviewers: string;
};

const PRS: PullRequest[] = [
  {
    repo: 'checkout-api',
    title: 'Add idempotency key validation to payment capture',
    author: '@mrivera',
    age: '2d',
    checks: 'green',
    reviewers: 'platform-core',
  },
  {
    repo: 'stagedoor-web',
    title: 'Move onboarding checklist behind feature flag',
    author: '@nchen',
    age: '18h',
    checks: 'pending',
    reviewers: 'growth-experiments',
  },
  {
    repo: 'etl-orders',
    title: 'Backfill late-arriving fulfillment events',
    author: '@hlefebvre',
    age: '4d',
    checks: 'failing',
    reviewers: 'data-pipelines',
  },
  {
    repo: 'feature-flags',
    title: 'Expose audit stream to Backstage catalog annotations',
    author: '@atsosie',
    age: '7h',
    checks: 'green',
    reviewers: 'platform-core',
  },
];

const CHECK_COLOR: Record<PullRequest['checks'], string> = {
  green: appTokens.ok,
  pending: appTokens.warn,
  failing: appTokens.bad,
};

const useStyles = makeStyles(() => ({
  card: {
    background: appTokens.surface,
    border: `1px solid ${appTokens.border}`,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: `1px solid ${appTokens.border}`,
  },
  title: { fontSize: 13, fontWeight: 600 },
  meta: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: appTokens.mute,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: 12,
    padding: '12px 16px',
    borderBottom: `1px solid ${appTokens.border}`,
    '&:last-child': { borderBottom: 'none' },
  },
  repo: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: appTokens.accent,
    marginBottom: 4,
  },
  prTitle: {
    fontSize: 13,
    color: appTokens.ink,
    lineHeight: 1.35,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  sub: {
    marginTop: 5,
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10.5,
    color: appTokens.mute,
  },
  right: {
    display: 'grid',
    justifyItems: 'end',
    alignContent: 'space-between',
    gap: 8,
  },
  age: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    color: appTokens.ink2,
  },
  checks: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  swatch: { width: 8, height: 8, display: 'inline-block' },
}));

export const OutstandingPrs = () => {
  const classes = useStyles();

  return (
    <div className={classes.card}>
      <div className={classes.header}>
        <div className={classes.title}>Outstanding GitHub PRs</div>
        <div className={classes.meta}>mock · GitHub</div>
      </div>
      {PRS.map(pr => (
        <div key={`${pr.repo}-${pr.title}`} className={classes.row}>
          <div>
            <div className={classes.repo}>{pr.repo}</div>
            <div className={classes.prTitle}>{pr.title}</div>
            <div className={classes.sub}>
              {pr.author} · review: {pr.reviewers}
            </div>
          </div>
          <div className={classes.right}>
            <span className={classes.age}>{pr.age}</span>
            <span className={classes.checks} style={{ color: CHECK_COLOR[pr.checks] }}>
              <span className={classes.swatch} style={{ background: CHECK_COLOR[pr.checks] }} />
              {pr.checks}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
