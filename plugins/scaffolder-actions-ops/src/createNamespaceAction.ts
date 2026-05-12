// plugins/scaffolder-actions-ops/src/createNamespaceAction.ts
//
// Custom scaffolder action `ops:namespace:create`. Mirrors the
// `ops:topic:create` action: posts to ops-request-bridge, which publishes
// a CloudEvent on the `ops.requests` NSQ topic, sends an approval
// notification, and waits for ops-controller's Temporal workflow to
// proceed once the request is approved.

import fetch from 'node-fetch';
import type { DiscoveryService } from '@backstage/backend-plugin-api';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';

// RFC 1123 label, same validation as the bridge router.
const K8S_NAMESPACE_RE = /^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?$/;

interface CreateActionDeps {
  discovery: DiscoveryService;
}

export const createNamespaceAction = (deps: CreateActionDeps) =>
  createTemplateAction({
    id: 'ops:namespace:create',
    description:
      'Submit a namespace-create request through ops-request-bridge. ' +
      'Backstage sends an approval notification; after approval the ' +
      'ops-controller signals Temporal which dispatches the namespace.',
    schema: {
      input: {
        namespace: zImpl =>
          zImpl
            .string()
            .regex(K8S_NAMESPACE_RE)
            .describe('Kubernetes namespace name (RFC 1123 label)'),
        owner: zImpl =>
          zImpl
            .string()
            .min(1)
            .describe(
              'Owner entity ref, e.g. group:default/platform or user:default/sam',
            ),
        size: zImpl =>
          zImpl
            .enum(['S', 'M', 'L'])
            .describe('T-shirt size; controls ResourceQuota in the workflow.'),
        reason: zImpl =>
          zImpl.string().optional().describe('Free text for the audit trail'),
      },
      output: {
        requestId: zImpl =>
          zImpl.string().describe('CloudEvent id of the published request'),
        approvalUrl: zImpl =>
          zImpl.string().describe('Backstage approval page for this request'),
        busTopic: zImpl =>
          zImpl
            .string()
            .describe('NSQ topic the request CloudEvent was published onto'),
        cloudEventType: zImpl => zImpl.string(),
      },
    },
    async handler(ctx) {
      const { namespace, owner, size, reason } = ctx.input;

      const requestedBy =
        (ctx as any).user?.entity?.metadata?.name &&
        (ctx as any).user?.entity?.kind
          ? `${(ctx as any).user.entity.kind.toLowerCase()}:${
              (ctx as any).user.entity.metadata.namespace ?? 'default'
            }/${(ctx as any).user.entity.metadata.name}`
          : 'user:default/guest';

      const baseUrl = await deps.discovery.getBaseUrl('ops-request-bridge');
      const url = `${baseUrl}/namespaces/create`;
      ctx.logger.info(`submitting namespace-create request to ${url}`);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          namespace,
          owner,
          size,
          reason,
          requestedBy,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`ops-request-bridge failed: ${res.status} ${text}`);
      }

      const body = (await res.json()) as {
        requestId: string;
        approvalUrl: string;
        busTopic: string;
        type: string;
      };

      ctx.logger.info(
        `request accepted; approval notification sent (requestId=${body.requestId})`,
      );
      ctx.output('requestId', body.requestId);
      ctx.output('approvalUrl', body.approvalUrl);
      ctx.output('busTopic', body.busTopic);
      ctx.output('cloudEventType', body.type);
    },
  });
