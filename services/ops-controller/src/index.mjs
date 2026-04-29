// ops-controller
// -----------------------------------------------------------------------------
// Subscribes to the `catalog.events` NSQ topic and reacts to entity changes.
//
// Wire format: CloudEvents 1.0 (JSON structured-mode). See schemas/README.md
// at the repo root for the full envelope + data definition.
//
// Today the only handler that does anything interesting is for Resources of
// `spec.type: namespace`, where we *would* hand off to a Temporal workflow
// that drives Pulumi automation to provision a Kubernetes namespace.
// -----------------------------------------------------------------------------

import nsq from 'nsqjs';

const TOPIC = process.env.OPS_TOPIC ?? 'catalog.events';
const CHANNEL = process.env.OPS_CHANNEL ?? 'ops-controller';
const LOOKUPD = (process.env.OPS_LOOKUPD ?? 'http://localhost:4161').replace(
  /^https?:\/\//,
  '',
);

const reader = new nsq.Reader(TOPIC, CHANNEL, {
  lookupdHTTPAddresses: LOOKUPD,
  maxInFlight: 10,
});

reader.on('nsqd_connected', (host, port) => {
  log('connected to nsqd', `${host}:${port}`, `topic=${TOPIC}`, `channel=${CHANNEL}`);
});
reader.on('error', err => log('reader error:', err.message));
reader.on('message', onMessage);

reader.connect();
log(`ops-controller starting; lookupd=${LOOKUPD} topic=${TOPIC} channel=${CHANNEL}`);

// -----------------------------------------------------------------------------

/**
 * Minimal CloudEvent validator. We only check the fields we actually depend
 * on — full JSON-Schema validation is overkill for an internal bus. Returns
 * a normalized object or throws.
 */
function parseCloudEvent(buf) {
  const raw = JSON.parse(buf.toString('utf8'));
  if (raw.specversion !== '1.0') {
    throw new Error(`unsupported specversion: ${raw.specversion}`);
  }
  for (const k of ['id', 'source', 'type']) {
    if (typeof raw[k] !== 'string' || !raw[k]) {
      throw new Error(`missing required CloudEvent attribute: ${k}`);
    }
  }
  return {
    id: raw.id,
    source: raw.source,
    type: raw.type,
    time: raw.time,
    subject: raw.subject,
    data: raw.data ?? {},
  };
}

function onMessage(msg) {
  let ev;
  try {
    ev = parseCloudEvent(msg.body);
  } catch (err) {
    log('drop: invalid CloudEvent:', err.message);
    msg.finish();
    return;
  }

  const { type, subject, data } = ev;
  const kind = data.kind ?? '?';
  const specType = data.specType ?? '-';
  log(`event ${type} ${subject} (kind=${kind} specType=${specType})`);

  // Route on (CloudEvent type, data.kind, data.specType).
  if (
    type.startsWith('io.backstage.catalog.entity.') &&
    kind === 'Resource' &&
    specType === 'namespace'
  ) {
    dispatchNamespace(ev);
  }

  msg.finish();
}

/**
 * Pretend to start a Temporal workflow that runs Pulumi automation.
 * Right now this just prints the plan so demos are legible.
 */
function dispatchNamespace(ev) {
  const entity = ev.data.entity ?? ev.data.previousEntity ?? {};
  const meta = entity.metadata ?? {};
  const ann = meta.annotations ?? {};
  const name = meta.name ?? '<unknown>';
  const cluster = ann['ops.backstage.io/cluster'] ?? 'dev-use1';
  const cpu = ann['ops.backstage.io/quota-cpu'] ?? '4';
  const memory = ann['ops.backstage.io/quota-memory'] ?? '8Gi';
  const owner = entity.spec?.owner ?? 'unknown';

  // Map CloudEvent types to workflow operations.
  const op = {
    'io.backstage.catalog.entity.added': 'CreateNamespace',
    'io.backstage.catalog.entity.changed': 'ReconcileNamespace',
    'io.backstage.catalog.entity.removed': 'DecommissionNamespace',
  }[ev.type];

  const workflowId = `namespace-${cluster}-${name}`;

  log('--- namespace event ---');
  log(`  ce.id:      ${ev.id}`);
  log(`  ce.type:    ${ev.type}`);
  log(`  ce.subject: ${ev.subject}`);
  log(`  would start Temporal workflow:`);
  log(`    workflow:    ops.namespace.${op}`);
  log(`    workflowId:  ${workflowId}`);
  log(`    taskQueue:   ops-namespace`);
  log(`    args:        ${JSON.stringify({ name, cluster, owner, cpu, memory })}`);
  log(`  which would invoke Pulumi automation:`);
  log(`    pulumi up --stack ns/${cluster}/${name}`);
  if (op === 'DecommissionNamespace') {
    log(`    pulumi destroy --stack ns/${cluster}/${name}   # remove all resources`);
  } else {
    log(`    resources:`);
    log(`      - kubernetes:core/v1:Namespace               ${name}`);
    log(`      - kubernetes:rbac.../RoleBinding             ${name}-admins (owner=${owner})`);
    log(`      - kubernetes:networking.../NetworkPolicy     ${name}-default-deny`);
    log(`      - kubernetes:core/v1:ResourceQuota           ${name}-quota (cpu=${cpu}, mem=${memory})`);
    log(`      - kubernetes:core/v1:LimitRange              ${name}-limits`);
  }
  log('-----------------------');
}

function log(...args) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [ops-controller]`, ...args);
}

// graceful shutdown
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    log(`received ${sig}, closing reader…`);
    reader.close();
    setTimeout(() => process.exit(0), 250);
  });
}
