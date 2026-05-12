// plugins/ops-request-bridge-backend/src/router.ts
//
// Routes:
//   POST /topics/create
//     Validate input, build a CloudEvent, publish to `ops.requests`, and
//     float a Backstage notification asking the current user to approve.
//
//   GET /approvals/:requestId
//     Return in-memory request context for the approval page.
//
//   POST /approvals/:requestId
//     Publish an approval decision to `ops.responses`; ops-controller
//     consumes it and signals the waiting Temporal workflow.

import { Router, json } from 'express';
import type { LoggerService } from '@backstage/backend-plugin-api';
import type { NotificationService } from '@backstage/plugin-notifications-node';
import {
  buildApprovalDecision,
  buildNamespaceCreateRequest,
  buildTopicCreateRequest,
  NsqPublisher,
  type NamespaceSize,
  type OpsRequest,
} from './publisher';

// NSQ topic name validation. Matches the rule in nsqd:
//   ^[.a-zA-Z0-9_-]+(?:#ephemeral)?$, max 64 chars
// We additionally reject leading dots and the explicit `#ephemeral`
// suffix (toggled via the `ephemeral` flag instead).
const NSQ_TOPIC_RE = /^[a-zA-Z0-9][.a-zA-Z0-9_-]{0,63}$/;

// Kubernetes namespace name (RFC 1123 label): lowercase alphanumerics +
// hyphens, must start/end alphanumeric, max 63 chars.
const K8S_NAMESPACE_RE = /^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?$/;

const NAMESPACE_SIZES: ReadonlySet<NamespaceSize> = new Set(['S', 'M', 'L']);

type ApprovalStatus = 'pending' | 'approved' | 'rejected';

type ApprovalRecord = {
  requestId: string;
  status: ApprovalStatus;
  request: OpsRequest;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionReason?: string;
};

interface RouterDeps {
  logger: LoggerService;
  publisher: NsqPublisher;
  notificationService: NotificationService;
  topic: string; // NSQ topic to publish requests onto, e.g. "ops.requests"
  responsesTopic: string; // NSQ topic to publish user decisions onto, e.g. "ops.responses"
}

export function createRouter(deps: RouterDeps): Router {
  const router = Router();
  const approvals = new Map<string, ApprovalRecord>();

  router.use(json());

  router.post('/topics/create', async (req, res) => {
    const { name, ephemeral, requestedBy, reason } = req.body ?? {};

    if (typeof name !== 'string' || !NSQ_TOPIC_RE.test(name)) {
      res.status(400).json({
        error:
          'invalid topic name; must match [a-zA-Z0-9][.a-zA-Z0-9_-]{0,63}',
      });
      return;
    }
    if (typeof requestedBy !== 'string' || !requestedBy) {
      res.status(400).json({ error: 'requestedBy is required' });
      return;
    }

    const opsRequest = buildTopicCreateRequest({
      topic: name,
      ephemeral: typeof ephemeral === 'boolean' ? ephemeral : undefined,
      requestedBy,
      reason: typeof reason === 'string' && reason ? reason : undefined,
    });

    approvals.set(opsRequest.id, {
      requestId: opsRequest.id,
      status: 'pending',
      request: opsRequest,
      createdAt: new Date().toISOString(),
    });

    try {
      await deps.publisher.publish(deps.topic, opsRequest);
    } catch (err) {
      approvals.delete(opsRequest.id);
      deps.logger.error(`failed to publish ops-request: ${err}`);
      res.status(502).json({ error: `nsq publish failed: ${err}` });
      return;
    }

    // Current-user-as-approver demo: send the approval notification to
    // the same entity ref that submitted the request. The card links to
    // our custom approval page, where approve/reject buttons live.
    try {
      await deps.notificationService.send({
        recipients: { type: 'entity', entityRef: requestedBy },
        payload: {
          title: `Approve NSQ topic: ${name}`,
          description:
            reason ||
            'A topic-create workflow is waiting for approval before it calls nsqd.',
          severity: 'high',
          topic: 'ops.approvals',
          link: `/admin/topics/approvals/${opsRequest.id}`,
          icon: 'approval',
          metadata: {
            requestId: opsRequest.id,
            topic: name,
            workflow: 'CreateNsqTopic',
          },
        },
      });
    } catch (err) {
      // Don't fail the request after the workflow has started; the
      // accepted page includes a direct approval link as a fallback.
      deps.logger.warn(`failed to send approval notification: ${err}`);
    }

    res.status(202).json({
      requestId: opsRequest.id,
      type: opsRequest.type,
      subject: opsRequest.subject,
      busTopic: deps.topic,
      approvalUrl: `/admin/topics/approvals/${opsRequest.id}`,
    });
  });

  router.post('/namespaces/create', async (req, res) => {
    const { namespace, owner, size, requestedBy, reason } = req.body ?? {};

    if (typeof namespace !== 'string' || !K8S_NAMESPACE_RE.test(namespace)) {
      res.status(400).json({
        error:
          'invalid namespace name; must be RFC 1123 label (lowercase alphanumerics + hyphens, max 63)',
      });
      return;
    }
    if (typeof owner !== 'string' || !owner) {
      res.status(400).json({ error: 'owner is required (entity ref)' });
      return;
    }
    if (typeof size !== 'string' || !NAMESPACE_SIZES.has(size as NamespaceSize)) {
      res.status(400).json({ error: 'size must be S, M, or L' });
      return;
    }
    if (typeof requestedBy !== 'string' || !requestedBy) {
      res.status(400).json({ error: 'requestedBy is required' });
      return;
    }

    const opsRequest = buildNamespaceCreateRequest({
      namespace,
      owner,
      size: size as NamespaceSize,
      requestedBy,
      reason: typeof reason === 'string' && reason ? reason : undefined,
    });

    approvals.set(opsRequest.id, {
      requestId: opsRequest.id,
      status: 'pending',
      request: opsRequest,
      createdAt: new Date().toISOString(),
    });

    try {
      await deps.publisher.publish(deps.topic, opsRequest);
    } catch (err) {
      approvals.delete(opsRequest.id);
      deps.logger.error(`failed to publish ops-request: ${err}`);
      res.status(502).json({ error: `nsq publish failed: ${err}` });
      return;
    }

    try {
      await deps.notificationService.send({
        recipients: { type: 'entity', entityRef: requestedBy },
        payload: {
          title: `Approve namespace request: ${namespace} (${size})`,
          description:
            reason ||
            'A namespace-create workflow is waiting for approval before it dispatches to the cluster.',
          severity: 'high',
          topic: 'ops.approvals',
          link: `/admin/namespaces/approvals/${opsRequest.id}`,
          icon: 'approval',
          metadata: {
            requestId: opsRequest.id,
            namespace,
            size,
            owner,
            workflow: 'CreateNamespace',
          },
        },
      });
    } catch (err) {
      deps.logger.warn(`failed to send approval notification: ${err}`);
    }

    res.status(202).json({
      requestId: opsRequest.id,
      type: opsRequest.type,
      subject: opsRequest.subject,
      busTopic: deps.topic,
      approvalUrl: `/admin/namespaces/approvals/${opsRequest.id}`,
    });
  });

  router.get('/approvals/:requestId', (req, res) => {
    const record = approvals.get(req.params.requestId);
    if (!record) {
      res.status(404).json({ error: 'approval request not found' });
      return;
    }
    res.json(record);
  });

  router.post('/approvals/:requestId', async (req, res) => {
    const record = approvals.get(req.params.requestId);
    if (!record) {
      res.status(404).json({ error: 'approval request not found' });
      return;
    }
    if (record.status !== 'pending') {
      res.status(409).json({ error: `approval is already ${record.status}` });
      return;
    }

    const { decision, decidedBy, reason } = req.body ?? {};
    if (decision !== 'approve' && decision !== 'reject') {
      res.status(400).json({ error: 'decision must be approve or reject' });
      return;
    }
    if (typeof decidedBy !== 'string' || !decidedBy) {
      res.status(400).json({ error: 'decidedBy is required' });
      return;
    }

    const response = buildApprovalDecision({
      requestId: record.requestId,
      decision,
      decidedBy,
      reason: typeof reason === 'string' && reason ? reason : undefined,
    });

    try {
      await deps.publisher.publish(deps.responsesTopic, response);
    } catch (err) {
      deps.logger.error(`failed to publish approval response: ${err}`);
      res.status(502).json({ error: `nsq publish failed: ${err}` });
      return;
    }

    record.status = decision === 'approve' ? 'approved' : 'rejected';
    record.decidedAt = new Date().toISOString();
    record.decidedBy = decidedBy;
    record.decisionReason = response.data.reason;

    res.status(202).json({
      requestId: record.requestId,
      status: record.status,
      responseId: response.id,
      responsesTopic: deps.responsesTopic,
    });
  });

  return router;
}
