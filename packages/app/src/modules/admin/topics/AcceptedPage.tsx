// packages/app/src/modules/admin/topics/AcceptedPage.tsx
//
// Post-submit landing for /admin/topics/new. Pure UI \u2014 no polling,
// no result subscription. The user verifies in nsqadmin (linked).

import { Link, useParams, useSearchParams } from 'react-router-dom';
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
  title: {
    fontSize: 30,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: appTokens.ink,
    margin: 0,
  },
  body: {
    background: appTokens.bg,
    padding: '16px 24px 24px',
  },
  card: {
    background: appTokens.surface,
    border: `1px solid ${appTokens.border}`,
    padding: '24px 28px',
    maxWidth: 720,
    margin: '0 auto',
    display: 'grid',
    gap: 16,
  },
  pill: {
    display: 'inline-block',
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontWeight: 600,
    padding: '4px 8px',
    border: `1px solid ${appTokens.borderHard}`,
    background: appTokens.accentSoft,
    color: appTokens.ink2,
  },
  k: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: appTokens.mute,
    fontWeight: 600,
  },
  v: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 12.5,
    color: appTokens.ink,
    wordBreak: 'break-all' as const,
  },
  row: { display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8, alignItems: 'baseline' },
  links: { display: 'flex', gap: 12, marginTop: 8 },
  link: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 12,
    color: appTokens.accent,
    textDecoration: 'none',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
}));

export const AcceptedPage = () => {
  const classes = useStyles();
  const { requestId = '' } = useParams();
  const [search] = useSearchParams();
  const topic = search.get('topic') ?? '';

  return (
    <>
      <div className={classes.hero}>
        <div className={classes.kicker}>// Admin / Topics / Accepted</div>
        <h1 className={classes.title}>Request submitted</h1>
      </div>
      <div className={classes.body}>
        <div className={classes.card}>
          <div className={classes.pill}>HTTP 202 · waiting for approval</div>
          <div className={classes.row}>
            <span className={classes.k}>Request ID</span>
            <span className={classes.v}>{requestId}</span>
          </div>
          <div className={classes.row}>
            <span className={classes.k}>Topic</span>
            <span className={classes.v}>{topic || '\u2014'}</span>
          </div>
          <div className={classes.row}>
            <span className={classes.k}>Bus topic</span>
            <span className={classes.v}>ops.requests</span>
          </div>
          <div className={classes.row}>
            <span className={classes.k}>CloudEvent type</span>
            <span className={classes.v}>io.elliott.ops.topic.create.requested</span>
          </div>
          <div>
            The ops-controller consumer is subscribed to{' '}
            <code>ops.requests</code> and will start a Temporal workflow
            (<code>CreateNsqTopic</code>) that waits for an approval signal.
            You should also see a notification in the bell menu. Approve
            the request, then the workflow calls nsqd's{' '}
            <code>/topic/create</code> for <code>{topic}</code>.
          </div>
          <div className={classes.links}>
            <Link className={classes.link} to={`/admin/topics/approvals/${requestId}`}>
              Review approval ▸
            </Link>
            <a className={classes.link} href="http://localhost:4171" target="_blank" rel="noreferrer">
              Open nsqadmin ▸
            </a>
            <a className={classes.link} href="http://localhost:8233" target="_blank" rel="noreferrer">
              Open Temporal UI ▸
            </a>
            <Link className={classes.link} to="/admin/topics/new">
              Submit another ▸
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};
