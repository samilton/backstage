// packages/app/src/modules/admin/topics/NewTopicPage.tsx
//
// Demo form: submit -> Backstage backend (ops-request-bridge) ->
// CloudEvent on NSQ topic `ops.requests` -> ops-controller consumer ->
// Temporal workflow waits for an approval signal -> nsqd /topic/create.
// The new topic appears in nsqadmin after approval.
//
// Skipping for the demo:
//   * Permission gating (the route is unauth on the backend; the menu
//     is gated by useIsAdmin which is a stub).
//   * Result-event subscription. We just show the requestId and let
//     the user verify in nsqadmin.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import { useApi, identityApiRef } from '@backstage/core-plugin-api';
import { fetchApiRef } from '@backstage/core-plugin-api';
import { discoveryApiRef } from '@backstage/core-plugin-api';
import { appTokens } from '../../theme/appTheme';

const NSQ_TOPIC_RE = /^[a-zA-Z0-9][.a-zA-Z0-9_-]{0,63}$/;

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
  subtitle: {
    marginTop: 4,
    fontSize: 13.5,
    color: appTokens.ink2,
    maxWidth: 720,
  },
  body: {
    background: appTokens.bg,
    padding: '16px 24px 24px',
  },
  card: {
    background: appTokens.surface,
    border: `1px solid ${appTokens.border}`,
    padding: '24px 28px',
    maxWidth: 640,
    margin: '0 auto',
    display: 'grid',
    gap: 18,
  },
  field: { display: 'grid', gap: 6 },
  label: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10.5,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: appTokens.mute,
    fontWeight: 600,
  },
  input: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 13,
    padding: '8px 10px',
    border: `1px solid ${appTokens.borderHard}`,
    background: appTokens.surface,
    color: appTokens.ink,
    outline: 'none',
    '&:focus': { borderColor: appTokens.ink },
  },
  textarea: {
    fontFamily: '"Inter", system-ui, sans-serif',
    fontSize: 13,
    padding: '8px 10px',
    border: `1px solid ${appTokens.borderHard}`,
    background: appTokens.surface,
    color: appTokens.ink,
    minHeight: 80,
    resize: 'vertical' as const,
    outline: 'none',
  },
  checkRow: { display: 'flex', alignItems: 'center', gap: 8 },
  hint: { fontSize: 12, color: appTokens.mute },
  flow: {
    background: appTokens.surface2,
    border: `1px solid ${appTokens.border}`,
    padding: '12px 14px',
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11.5,
    color: appTokens.ink2,
    lineHeight: 1.6,
  },
  err: {
    color: appTokens.bad,
    fontSize: 12.5,
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 10 },
  submit: {
    // backgroundColor (not background shorthand) so this wins against
    // MUI v4's own backgroundColor rule on contained buttons.
    backgroundColor: appTokens.accent,
    color: appTokens.accentInk,
    boxShadow: 'none',
    '&:hover': { backgroundColor: '#b9e34d', boxShadow: 'none' },
  },
}));

export const NewTopicPage = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const fetchApi = useApi(fetchApiRef);
  const discoveryApi = useApi(discoveryApiRef);
  const identityApi = useApi(identityApiRef);

  const [name, setName] = useState('');
  const [ephemeral, setEphemeral] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    if (!NSQ_TOPIC_RE.test(name)) {
      setError(
        'Topic must match [a-zA-Z0-9][.a-zA-Z0-9_-]{0,63} (no leading dot, no #ephemeral suffix)',
      );
      return;
    }
    setSubmitting(true);
    try {
      const baseUrl = await discoveryApi.getBaseUrl('ops-request-bridge');
      const { userEntityRef } = await identityApi.getBackstageIdentity();
      const res = await fetchApi.fetch(`${baseUrl}/topics/create`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          ephemeral,
          reason: reason || undefined,
          requestedBy: userEntityRef,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`backend ${res.status}: ${text}`);
      }
      const body = (await res.json()) as { requestId: string };
      navigate(`/admin/topics/new/accepted/${body.requestId}?topic=${encodeURIComponent(name)}`);
    } catch (err: any) {
      setError(err?.message ?? String(err));
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className={classes.hero}>
        <div className={classes.kicker}>// Admin / Topics / New</div>
        <h1 className={classes.title}>Create NSQ topic</h1>
        <div className={classes.subtitle}>
          Submit a CloudEvent on <code>ops.requests</code>. The
          ops-controller consumer picks it up and starts a Temporal workflow
          that waits for approval. Backstage also sends you a notification;
          approving it publishes <code>ops.responses</code>, which signals
          the workflow to call nsqd's <code>/topic/create</code>.
        </div>
      </div>
      <div className={classes.body}>
        <form className={classes.card} onSubmit={onSubmit}>
          <div className={classes.flow}>
            form → POST /api/ops-request-bridge/topics/create
            <br />
            backend → CloudEvent → NSQ topic <b>ops.requests</b>
            <br />
            ops-controller → Temporal workflow CreateNsqTopic waits
            <br />
            notification → approve → ops.responses → workflow signal
            <br />
            activity → POST nsqd /topic/create?topic={name || '<name>'}
          </div>

          <label className={classes.field}>
            <span className={classes.label}>Topic name</span>
            <input
              className={classes.input}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. checkout.events"
              required
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
            <span className={classes.hint}>
              Letters, digits, dot, underscore, hyphen. Max 64 chars.
            </span>
          </label>

          <label className={`${classes.field} ${classes.checkRow}`}>
            <input
              type="checkbox"
              checked={ephemeral}
              onChange={e => setEphemeral(e.target.checked)}
            />
            <span className={classes.hint}>
              Ephemeral (deleted when no consumers). For demos only.
            </span>
          </label>

          <label className={classes.field}>
            <span className={classes.label}>Reason</span>
            <textarea
              className={classes.textarea}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why this topic? (free text, for the audit trail)"
            />
          </label>

          {error && <div className={classes.err}>✗ {error}</div>}

          <div className={classes.actions}>
            <Button
              variant="outlined"
              onClick={() => navigate('/admin')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              className={classes.submit}
              disabled={submitting || !name}
            >
              {submitting ? 'Submitting…' : 'Submit request'}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};
