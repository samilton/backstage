// plugins/ops-request-bridge-backend/src/publisher.ts
//
// Tiny CloudEvent + NSQ publisher for ops-request / ops-response events.
// Demo-grade: no JSON Schema file, no retries beyond NSQ's at-least-once.
// The request wire shape is documented here AND in
// ops-controller/internal/opsrequests/event.go; the approval response
// shape is mirrored in ops-controller/internal/opsresponses/event.go.

import fetch from 'node-fetch';
import { randomUUID } from 'crypto';
import type { LoggerService } from '@backstage/backend-plugin-api';

export const EVENT_SOURCE = '/backstage/admin';

/** Reverse-DNS event types. Add new ones as the demo grows. */
export type OpsRequestType =
  | 'io.elliott.ops.topic.create.requested'
  | 'io.elliott.ops.namespace.create.requested';
export type OpsResponseType = 'io.elliott.ops.approval.decided';

/** T-shirt sizing for namespace requests. The size -> quota mapping
 * lives in the Temporal workflow, not here, so we can change quota
 * policy without a wire-format bump. */
export type NamespaceSize = 'S' | 'M' | 'L';

/**
 * `data` payload shape for ops.requests. Discriminated union on `kind`.
 * Add new variants as the demo grows.
 */
export type OpsTopicCreateData = {
  kind: 'topic';
  action: 'create';
  topic: string;
  ephemeral?: boolean;
  requestedBy: string;
  reason?: string;
};

export type OpsNamespaceCreateData = {
  kind: 'namespace';
  action: 'create';
  namespace: string;
  owner: string; // entity ref, e.g. "group:default/platform"
  size: NamespaceSize;
  requestedBy: string;
  reason?: string;
};

export type OpsRequestData = OpsTopicCreateData | OpsNamespaceCreateData;

export type OpsApprovalDecisionData = {
  kind: 'approval';
  requestId: string;
  decision: 'approve' | 'reject';
  decidedBy: string;
  reason?: string;
};

export interface CloudEventLike<TType extends string, TData> {
  id: string;
  time: string;
  type: TType;
  subject: string;
  data: TData;
}

export type OpsRequest = CloudEventLike<OpsRequestType, OpsRequestData>;
export type OpsApprovalDecision = CloudEventLike<
  OpsResponseType,
  OpsApprovalDecisionData
>;

export function buildTopicCreateRequest(input: {
  topic: string;
  ephemeral?: boolean;
  requestedBy: string;
  reason?: string;
}): OpsRequest {
  return {
    id: randomUUID(),
    time: new Date().toISOString(),
    type: 'io.elliott.ops.topic.create.requested',
    subject: `topic:${input.topic}`,
    data: {
      kind: 'topic',
      action: 'create',
      topic: input.topic,
      ephemeral: input.ephemeral,
      requestedBy: input.requestedBy,
      reason: input.reason,
    },
  };
}

export function buildNamespaceCreateRequest(input: {
  namespace: string;
  owner: string;
  size: NamespaceSize;
  requestedBy: string;
  reason?: string;
}): OpsRequest {
  return {
    id: randomUUID(),
    time: new Date().toISOString(),
    type: 'io.elliott.ops.namespace.create.requested',
    subject: `namespace:${input.namespace}`,
    data: {
      kind: 'namespace',
      action: 'create',
      namespace: input.namespace,
      owner: input.owner,
      size: input.size,
      requestedBy: input.requestedBy,
      reason: input.reason,
    },
  };
}

export function buildApprovalDecision(input: {
  requestId: string;
  decision: 'approve' | 'reject';
  decidedBy: string;
  reason?: string;
}): OpsApprovalDecision {
  return {
    id: randomUUID(),
    time: new Date().toISOString(),
    type: 'io.elliott.ops.approval.decided',
    subject: `request:${input.requestId}`,
    data: {
      kind: 'approval',
      requestId: input.requestId,
      decision: input.decision,
      decidedBy: input.decidedBy,
      reason: input.reason,
    },
  };
}

function toCloudEvent<TType extends string, TData>(
  req: CloudEventLike<TType, TData>,
): Record<string, unknown> {
  return {
    specversion: '1.0',
    id: req.id,
    source: EVENT_SOURCE,
    type: req.type,
    time: req.time,
    subject: req.subject,
    datacontenttype: 'application/json',
    data: req.data,
  };
}

export class NsqPublisher {
  constructor(
    private readonly nsqdHttpAddress: string,
    private readonly logger: LoggerService,
  ) {}

  async publish<TType extends string, TData>(
    topic: string,
    req: CloudEventLike<TType, TData>,
  ): Promise<void> {
    const url = `${this.nsqdHttpAddress}/pub?topic=${encodeURIComponent(topic)}`;
    const body = JSON.stringify(toCloudEvent(req));
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/cloudevents+json' },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`nsq publish failed: ${res.status} ${text}`);
    }
    this.logger.info(
      `ops event published id=${req.id} type=${req.type} subject=${req.subject} -> ${topic}`,
    );
  }
}
