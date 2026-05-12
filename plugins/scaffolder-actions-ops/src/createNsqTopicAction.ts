// plugins/scaffolder-actions-ops/src/createNsqTopicAction.ts
//
// Custom scaffolder action `ops:topic:create`. It reuses the same
// ops-request-bridge HTTP route as the bespoke admin form, so template
// submissions also get Backstage notifications + the approval gate.

import fetch from 'node-fetch';
import type { DiscoveryService } from '@backstage/backend-plugin-api';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';

// Schema fields receive a `zImpl` argument that's the zod instance used
// internally by the scaffolder. We must not import zod ourselves — the
// scaffolder pins a specific version and a stray import collides with it.

const NSQ_TOPIC_RE = /^[a-zA-Z0-9][.a-zA-Z0-9_-]{0,63}$/;

interface CreateActionDeps {
  discovery: DiscoveryService;
}

export const createNsqTopicAction = (deps: CreateActionDeps) =>
  createTemplateAction({
    id: 'ops:topic:create',
    description:
      'Submit a topic-create request through ops-request-bridge. ' +
      'Backstage sends an approval notification; after approval the ' +
      'ops-controller signals Temporal and creates the NSQ topic.',
    schema: {
      input: {
        topic: zImpl =>
          zImpl
            .string()
            .regex(NSQ_TOPIC_RE)
            .describe('NSQ topic name to create'),
        ephemeral: zImpl =>
          zImpl
            .boolean()
            .optional()
            .describe(
              'If true, append #ephemeral so nsqd auto-deletes when no consumers remain.',
            ),
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
      const { topic, ephemeral, reason } = ctx.input;

      const requestedBy =
        (ctx as any).user?.entity?.metadata?.name &&
        (ctx as any).user?.entity?.kind
          ? `${(ctx as any).user.entity.kind.toLowerCase()}:${
              (ctx as any).user.entity.metadata.namespace ?? 'default'
            }/${(ctx as any).user.entity.metadata.name}`
          : 'user:default/guest';

      const baseUrl = await deps.discovery.getBaseUrl('ops-request-bridge');
      const url = `${baseUrl}/topics/create`;
      ctx.logger.info(`submitting topic-create request to ${url}`);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: topic,
          ephemeral: typeof ephemeral === 'boolean' ? ephemeral : undefined,
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
