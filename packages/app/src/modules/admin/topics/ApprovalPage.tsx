// packages/app/src/modules/admin/topics/ApprovalPage.tsx
//
// Human approval surface for ops-request-bridge approvals. Today this
// renders both `topic:create` and `namespace:create` requests; the
// component switches on `record.request.data.kind`. Approve/reject
// POSTs back to ops-request-bridge, which publishes an `ops.responses`
// CloudEvent; the ops-controller consumes that event and signals the
// waiting Temporal workflow.
//
// Routes (see admin/index.tsx):
//   /admin/topics/approvals/:requestId      — CreateNsqTopic
//   /admin/namespaces/approvals/:requestId  — CreateNamespace

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import { useApi, identityApiRef, fetchApiRef, discoveryApiRef } from '@backstage/core-plugin-api';
import { appTokens } from '../../theme/appTheme';

type TopicData = {
  kind: 'topic';
  topic: string;
  ephemeral?: boolean;
  requestedBy: string;
  reason?: string;
};

type NamespaceData = {
  kind: 'namespace';
  namespace: string;
  owner: string;
  size: 'S' | 'M' | 'L';
  requestedBy: string;
  reason?: string;
};

type ApprovalRecord = {
  requestId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionReason?: string;
  request: {
    id: string;
    time: string;
    type: string;
    subject: string;
    data: TopicData | NamespaceData;
  };
};

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
    maxWidth: 760,
    margin: '0 auto',
    display: 'grid',
    gap: 16,
  },
  pill: {
    display: 'inline-block',
    width: 'fit-content',
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
  row: { display: 'grid', gridTemplateColumns: '170px 1fr', gap: 8, alignItems: 'baseline' },
  reasonBox: {
    background: appTokens.surface2,
    border: `1px solid ${appTokens.border}`,
    padding: 12,
    color: appTokens.ink2,
    fontSize: 13,
  },
  textarea: {
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: 13,
    padding: '8px 10px',
    border: `1px solid ${appTokens.borderHard}`,
    background: appTokens.surface,
    color: appTokens.ink,
    minHeight: 72,
    resize: 'vertical' as const,
    outline: 'none',
  },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  approve: {
    backgroundColor: appTokens.accent,
    color: appTokens.accentInk,
    boxShadow: 'none',
    '&:hover': { backgroundColor: '#b9e34d', boxShadow: 'none' },
  },
  err: {
    color: appTokens.bad,
    fontSize: 12.5,
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  },
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

export const ApprovalPage = () => {
  const classes = useStyles();
  const { requestId = '' } = useParams();
  const fetchApi = useApi(fetchApiRef);
  const discoveryApi = useApi(discoveryApiRef);
  const identityApi = useApi(identityApiRef);

  const [record, setRecord] = useState<ApprovalRecord | undefined>();
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const baseUrl = await discoveryApi.getBaseUrl('ops-request-bridge');
        const res = await fetchApi.fetch(`${baseUrl}/approvals/${requestId}`);
        if (!res.ok) {
          throw new Error(`backend ${res.status}: ${await res.text()}`);
        }
        const body = (await res.json()) as ApprovalRecord;
        if (!cancelled) {
          setRecord(body);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? String(err));
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [discoveryApi, fetchApi, requestId]);

  const decide = async (decision: 'approve' | 'reject') => {
    setBusy(decision);
    setError(undefined);
    try {
      const baseUrl = await discoveryApi.getBaseUrl('ops-request-bridge');
      const { userEntityRef } = await identityApi.getBackstageIdentity();
      const res = await fetchApi.fetch(`${baseUrl}/approvals/${requestId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          decision,
          decidedBy: userEntityRef,
          reason: comment || undefined,
        }),
      });
      if (!res.ok) {
        throw new Error(`backend ${res.status}: ${await res.text()}`);
      }
      const body = (await res.json()) as { status: ApprovalRecord['status'] };
      setRecord(prev => (prev ? { ...prev, status: body.status, decidedBy: userEntityRef } : prev));
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setBusy(undefined);
    }
  };

  const data = record?.request.data;
  const isNamespace = data?.kind === 'namespace';
  const kicker = isNamespace ? '// Admin / Namespaces / Approval' : '// Admin / Topics / Approval';
  const title = isNamespace ? 'Approve namespace request' : 'Approve NSQ topic';
  const workflowLabel = isNamespace
    ? `create-namespace:${record?.requestId ?? ''}`
    : `create-nsq-topic:${record?.requestId ?? ''}`;

  return (
    <>
      <div className={classes.hero}>
        <div className={classes.kicker}>{kicker}</div>
        <h1 className={classes.title}>{title}</h1>
      </div>
      <div className={classes.body}>
        <div className={classes.card}>
          {error && <div className={classes.err}>✗ {error}</div>}
          {!record && !error && <div>Loading approval request…</div>}
          {record && data && (
            <>
              <div className={classes.pill}>workflow gate · {record.status}</div>
              {data.kind === 'topic' && (
                <div className={classes.row}>
                  <span className={classes.k}>Topic</span>
                  <span className={classes.v}>
                    {data.topic}{data.ephemeral ? '#ephemeral' : ''}
                  </span>
                </div>
              )}
              {data.kind === 'namespace' && (
                <>
                  <div className={classes.row}>
                    <span className={classes.k}>Namespace</span>
                    <span className={classes.v}>{data.namespace}</span>
                  </div>
                  <div className={classes.row}>
                    <span className={classes.k}>Owner</span>
                    <span className={classes.v}>{data.owner}</span>
                  </div>
                  <div className={classes.row}>
                    <span className={classes.k}>Size</span>
                    <span className={classes.v}>{data.size}</span>
                  </div>
                </>
              )}
              <div className={classes.row}>
                <span className={classes.k}>Request ID</span>
                <span className={classes.v}>{record.requestId}</span>
              </div>
              <div className={classes.row}>
                <span className={classes.k}>Requested by</span>
                <span className={classes.v}>{data.requestedBy}</span>
              </div>
              <div className={classes.row}>
                <span className={classes.k}>Workflow</span>
                <span className={classes.v}>{workflowLabel}</span>
              </div>
              <div className={classes.reasonBox}>
                <b>Reason:</b> {data.reason || '—'}
              </div>
              {record.status === 'pending' ? (
                <>
                  <textarea
                    className={classes.textarea}
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Optional approval/rejection note"
                  />
                  <div className={classes.actions}>
                    <Button
                      variant="outlined"
                      disabled={!!busy}
                      onClick={() => decide('reject')}
                    >
                      {busy === 'reject' ? 'Rejecting…' : 'Reject'}
                    </Button>
                    <Button
                      variant="contained"
                      className={classes.approve}
                      disabled={!!busy}
                      onClick={() => decide('approve')}
                    >
                      {busy === 'approve' ? 'Approving…' : 'Approve & create'}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    Decision sent. The ops-controller will signal the Temporal workflow from
                    the <code> ops.responses </code> event.
                  </div>
                  <div className={classes.actions}>
                    <a className={classes.link} href="http://localhost:8233" target="_blank" rel="noreferrer">
                      Open Temporal UI ▸
                    </a>
                    <a className={classes.link} href="http://localhost:4171" target="_blank" rel="noreferrer">
                      Open nsqadmin ▸
                    </a>
                    <Link className={classes.link} to="/admin/topics/new">
                      New request ▸
                    </Link>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};
