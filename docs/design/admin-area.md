# Admin area + OPA gating

Status: skeleton landed (`packages/app/src/modules/admin/`), gate is a
stub returning `true`. This doc captures the shape we want once the
permission backend + OPA wiring lands.

## What exists today

- **`/admin`** — landing page, hero + 6 stub tiles (`AdminLandingPage`).
- **`/admin/tasks/:taskId`** — wraps the public `TaskPage` from
  `@backstage/plugin-scaffolder`. This is the redirect target after
  submitting a scaffolder template.
- **Sidebar `Admin` item** — rendered conditionally on `useIsAdmin()`
  in `modules/nav/Sidebar.tsx`.
- **`useIsAdmin()`** — `packages/app/src/modules/admin/useIsAdmin.ts`,
  returns `true`. Single seam for the policy gate.

The four scaffolder admin SubPages (`tasks`, `actions`, `editor`,
`templating-extensions`) are disabled in `app-config.yaml`. Re-enabling
any of them in app-config is a one-line change if you need it back as a
`/create` tab while the admin area fills in.

## Why a separate `/admin` rather than gate the `/create` tabs in place

PageBlueprint renders its tab bar directly from `inputs.pages`. There's
no built-in "hide tab but keep route" knob, and re-implementing
PageBlueprint just to filter tabs is an ugly amount of code for the
benefit. A separate page is honest about the access boundary, and the
sidebar gate is the right place for menu visibility.

## Gate vs. access control

`useIsAdmin()` is a **menu visibility** gate, not an access control
gate. Two reasons:

1. **`/admin/tasks/:taskId` must work for non-admins.** The wizard's
   post-submit redirect lands every user there to watch their own
   scaffolder run. Gating route access would break that.
2. **Menu gating is cheap and reversible.** A user who guesses the URL
   shouldn't see anything dangerous; the actual scaffolder/permission
   backends already enforce who can scaffold what. The menu is just a
   discoverability surface.

When OPA lands, decide per-route whether to also gate:

| Route                       | Menu gate | Route gate |
| --------------------------- | --------- | ---------- |
| `/admin`                    | yes       | yes        |
| `/admin/tasks/:taskId`      | no¹       | no         |
| future `/admin/actions`     | yes       | yes        |
| future `/admin/editor`      | yes       | yes        |
| future `/admin/locations`   | yes       | yes        |
| future `/admin/policy`      | yes       | yes        |

¹ Not menu-gated either — the route exists for the wizard's redirect.
We don't link to it from the admin landing page for non-admins; admins
will see a Tasks tile that lists recent task ids.

## OPA wiring

Policy lives in OPA, evaluated by the permission backend. Sketch:

```rego
package backstage.admin

default allow := false

allow if {
  input.subject.groups[_] == "group:platform-admins"
}

allow if {
  input.subject.userEntityRef == "user:default/sam.hamilton"
}
```

Backend side, replace `@backstage/plugin-permission-backend-module-allow-all-policy`
with a custom policy module that, for permissions in the `admin.*`
namespace, posts to OPA's `/v1/data/backstage/admin` and maps
`result.allow` to `AuthorizeResult.ALLOW` / `DENY`. Other permission
namespaces fall through to the default allow-all (or another rule set)
until we want to broaden the policy footprint.

Frontend side, define the custom permission once:

```ts
// packages/app/src/modules/admin/permissions.ts
import { createPermission } from '@backstage/plugin-permission-common';

export const adminAreaReadPermission = createPermission({
  name: 'admin.area.read',
  attributes: { action: 'read' },
});
```

`useIsAdmin()` becomes:

```ts
import { usePermission } from '@backstage/plugin-permission-react';
import { adminAreaReadPermission } from './permissions';

export const useIsAdmin = (): boolean => {
  const { allowed } = usePermission({ permission: adminAreaReadPermission });
  return allowed;
};
```

Boolean shape stays the same so callsites (`Sidebar.tsx`, future tile
filtering in `AdminLandingPage`) don't change.

## Open questions

- **Loading state.** `usePermission` returns `{ loading, allowed }`.
  Today the sidebar renders synchronously; under OPA there's a real
  fetch. Probably hide the menu until the answer arrives — flicker is
  ugly but flashing the admin link to a non-admin is worse.
- **Group resolution.** OPA needs the caller's groups. The simplest
  source is the `BackstageIdentityResponse.identity.ownershipEntityRefs`
  populated by the auth backend; that already includes group refs for
  guest+github providers. Confirm before wiring.
- **Per-tile gating.** Once tiles point at real admin tools, each will
  want its own permission (e.g. `admin.locations.write`,
  `admin.policy.read`). `AdminLandingPage` can hide tiles whose
  `usePermission` says no, same shape as the menu gate.
- **Decision logging.** OPA has decision logs natively. Plumb them to
  the same place we send catalog event-bridge logs (NSQ topic
  `policy.decisions`?) so on-call can replay an "I was denied" report.
  Out of scope for the first cut.
