// packages/app/src/modules/admin/useIsAdmin.ts
//
// Predicate hook for "is the current user allowed to see the admin area?".
//
// Today this is a stub that returns true — guest auth, single dev box.
// The real implementation will call into a permission/policy backend
// that evaluates an OPA rule like:
//
//   package backstage.admin
//
//   default allow := false
//   allow if {
//     input.subject.groups[_] == "group:platform-admins"
//   }
//
// Wiring plan (see docs/design/admin-area.md):
//   1. Register a custom permission (or use the existing
//      @backstage/plugin-permission-react `usePermission` hook) keyed
//      on something like `admin.area.read`.
//   2. The permission backend's policy delegates to OPA via the
//      `@backstage/plugin-permission-backend-module-allow-all-policy`
//      replacement we'll write — sends the requested permission +
//      identity/groups to OPA's `/v1/data/backstage/admin` endpoint
//      and maps `result.allow` to AuthorizeResult.ALLOW/DENY.
//   3. This hook becomes a thin wrapper around usePermission, with
//      the same boolean return shape so callsites don't change.
//
// Important: this hook is a *menu visibility* gate, not an access
// control gate. The /admin routes themselves are reachable directly
// (the wizard's post-submit redirect to /admin/tasks/:taskId needs to
// work even for non-admins, since they should see their own scaffolder
// task progress). When OPA lands, decide separately whether to also
// gate route access — likely yes for /admin landing, no for
// /admin/tasks/:taskId.

export const useIsAdmin = (): boolean => {
  // TODO(perms): swap for usePermission({ permission: adminAreaReadPermission })
  // once the permission + OPA policy are wired up.
  return true;
};
