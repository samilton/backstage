// packages/app/src/modules/home/widgets/syntheticHealth.ts
// Tier / lang / health resolution for catalog Components.
//
// Resolution order (first hit wins):
//   1. Real annotation       (elliott.io/tier, elliott.io/lang)
//   2. Derived from catalog  (spec.lifecycle → tier, spec.type → lang hint)
//   3. Deterministic synthetic (FNV-1a of name) so demos stay visually stable
//
// When you wire real signals (Prom, k8s, CI) into health, the synthetic
// path can go away. Tier/lang stay annotation-driven — set them in YAML.

import type { Entity } from '@backstage/catalog-model';

export const TIER_ANNOTATION = 'elliott.io/tier';
export const LANG_ANNOTATION = 'elliott.io/lang';

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

export type Health = 'healthy' | 'degraded' | 'down';

export const syntheticHealth = (name: string): Health => {
  // ~83% healthy, ~8% degraded, ~8% down
  const r = hash(name) % 12;
  if (r === 0) return 'down';
  if (r === 1) return 'degraded';
  return 'healthy';
};

const TIERS = ['T1', 'T2', 'T3'] as const;
const LANGS = ['Go', 'Rust', 'Python', 'TS', 'Node', 'Java'];

export const syntheticTier = (name: string) => TIERS[hash(`tier:${name}`) % 3];
export const syntheticLang = (name: string) => LANGS[hash(`lang:${name}`) % LANGS.length];

// Lifecycle → tier hint. Mirrors a common convention: prod = T1, staging = T2,
// everything else = T3. Override per-entity with the elliott.io/tier annotation.
const LIFECYCLE_TIER: Record<string, string> = {
  production:   'T1',
  prod:         'T1',
  staging:      'T2',
  beta:         'T2',
  experimental: 'T3',
  development:  'T3',
  deprecated:   'T3',
};

export const entityTier = (entity: Entity): string => {
  const annotated = entity.metadata.annotations?.[TIER_ANNOTATION];
  if (annotated) return annotated;
  const lifecycle = (entity.spec as { lifecycle?: string } | undefined)?.lifecycle;
  if (lifecycle && LIFECYCLE_TIER[lifecycle.toLowerCase()]) {
    return LIFECYCLE_TIER[lifecycle.toLowerCase()];
  }
  return syntheticTier(entity.metadata.name);
};

export const entityLang = (entity: Entity): string => {
  const annotated = entity.metadata.annotations?.[LANG_ANNOTATION];
  if (annotated) return annotated;
  // No catalog field encodes language directly; fall through to synthetic.
  return syntheticLang(entity.metadata.name);
};
