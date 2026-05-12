// packages/app/src/modules/scaffolder/TemplateWizardPage.tsx
// Custom wrapper for the scaffolder wizard. Replaces the default
// page chrome with a custom hero and lets Backstage's <Workflow>
// component own the actual stepper/form/review flow.
//
// Form decorators (registered via the alpha FormDecorator extension
// blueprint) are *not* run here yet — that machinery lives behind
// internal package paths in @backstage/plugin-scaffolder. Wire it in
// once a real decorator is needed; today nothing in the app registers
// one.

import { useCallback, useMemo } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import { makeStyles } from '@material-ui/core/styles';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { JsonObject, JsonValue } from '@backstage/types';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import {
  scaffolderApiRef,
  ScaffolderFieldExtensions,
  SecretsContextProvider,
  useCustomFieldExtensions,
  useTemplateSecrets,
} from '@backstage/plugin-scaffolder-react';
import {
  EntityNamePickerFieldExtension,
  EntityPickerFieldExtension,
  EntityTagsPickerFieldExtension,
  MultiEntityPickerFieldExtension,
  MyGroupsPickerFieldExtension,
  OwnedEntityPickerFieldExtension,
  OwnerPickerFieldExtension,
  RepoBranchPickerFieldExtension,
  RepoOwnerPickerFieldExtension,
  RepoUrlPickerFieldExtension,
} from '@backstage/plugin-scaffolder';
import { Workflow } from '@backstage/plugin-scaffolder-react/alpha';
import { appTokens } from '../theme/appTheme';
import { WizardHero } from './widgets/WizardHero';

// Outlet of public default field extensions. useCustomFieldExtensions
// scans this fragment and returns an array of FieldExtensionOptions for
// Workflow's `extensions` prop. This mirrors what the default scaffolder
// SubPage does internally with DEFAULT_SCAFFOLDER_FIELD_EXTENSIONS
// (which lives behind a private package path).
const defaultFieldOutlet = (
  <ScaffolderFieldExtensions>
    <EntityPickerFieldExtension />
    <EntityNamePickerFieldExtension />
    <EntityTagsPickerFieldExtension />
    <MultiEntityPickerFieldExtension />
    <MyGroupsPickerFieldExtension />
    <OwnedEntityPickerFieldExtension />
    <OwnerPickerFieldExtension />
    <RepoBranchPickerFieldExtension />
    <RepoOwnerPickerFieldExtension />
    <RepoUrlPickerFieldExtension />
  </ScaffolderFieldExtensions>
);

const useStyles = makeStyles(() => ({
  body: {
    background: appTokens.bg,
    padding: '16px 24px 24px',
  },
  // The Workflow component renders MUI Paper/Card surfaces internally;
  // they pick up the theme overrides automatically. We just give it a
  // contained max width so long forms don't sprawl.
  workflow: {
    maxWidth: 960,
    margin: '0 auto',
  },
}));

const WizardInner = () => {
  const classes = useStyles();
  const { namespace = 'default', templateName = '' } = useParams();
  const navigate = useNavigate();

  const catalogApi = useApi(catalogApiRef);
  const scaffolderApi = useApi(scaffolderApiRef);
  const { secrets } = useTemplateSecrets();

  const templateRef = stringifyEntityRef({
    kind: 'Template',
    namespace,
    name: templateName,
  });

  // Pull title/description from the template entity so the hero can
  // show the human-readable name rather than the slug.
  const { value: meta } = useAsync(async () => {
    const e = await catalogApi.getEntityByRef(templateRef);
    if (!e) return undefined;
    return {
      title: (e.metadata as any).title ?? e.metadata.name,
      description: e.metadata.description ?? '',
    };
  }, [templateRef]);

  const onCreate = useCallback(
    async (values: JsonObject) => {
      const { taskId } = await scaffolderApi.scaffold({
        templateRef,
        // Workflow gives us a JsonObject (optional values); the API expects
        // a Record<string, JsonValue>. Strip undefineds.
        values: values as Record<string, JsonValue>,
        secrets,
      });
      // Tasks live under /admin now — the scaffolder's own /create/tasks
      // SubPage is disabled in app-config so the /create tab bar shows
      // only Templates. /admin/tasks/:taskId is reachable directly even
      // for non-admins; only the sidebar menu visibility is gated.
      navigate(`/admin/tasks/${taskId}`);
    },
    [navigate, scaffolderApi, secrets, templateRef],
  );

  const onError = useCallback(() => <Navigate to="/create" />, []);

  const fieldExtensions = useCustomFieldExtensions(defaultFieldOutlet);
  // Memoised so Workflow doesn't see a fresh array on every render and
  // re-mount its stepper.
  const extensions = useMemo(() => fieldExtensions, [fieldExtensions]);

  return (
    <>
      <WizardHero
        templateName={templateName}
        title={meta?.title}
        description={meta?.description}
      />
      <div className={classes.body}>
        <div className={classes.workflow}>
          <Workflow
            namespace={namespace}
            templateName={templateName}
            onCreate={onCreate}
            onError={onError}
            extensions={extensions}
          />
        </div>
      </div>
    </>
  );
};

export const TemplateWizardPage = () => (
  <SecretsContextProvider>
    <WizardInner />
  </SecretsContextProvider>
);
