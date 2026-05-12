// packages/app/src/modules/scaffolder/index.tsx
//
// Custom scaffolder gallery + wizard for the new declarative frontend
// system. We override `sub-page:scaffolder/templates` (which the
// default plugin uses for both the /create gallery index and the
// /create/templates/:ns/:name wizard route).
//
// The default subpage is disabled in app-config.yaml; this module
// re-registers a SubPage with the same name attached to
// page:scaffolder, rendering nested routes:
//
//   /create/templates                       → TemplateGalleryPage
//   /create/templates/:namespace/:name      → TemplateWizardPage
//
// Notes on what we *don't* override:
//   • The parent /create page (scaffolderPage) — we keep its tab
//     header, so Templates / Tasks / Actions / Editor still navigate.
//   • The /create/tasks/:taskId task-runner page — out of scope.
//   • Custom RJSF form fields — Workflow picks them up from the
//     scaffolder plugin's FormFieldBlueprint extensions.

import { Route, Routes } from 'react-router-dom';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { SubPageBlueprint } from '@backstage/frontend-plugin-api';
import { TemplateGalleryPage } from './TemplateGalleryPage';
import { TemplateWizardPage } from './TemplateWizardPage';

const TemplatesRouter = () => (
  <Routes>
    <Route index element={<TemplateGalleryPage />} />
    <Route path=":namespace/:templateName" element={<TemplateWizardPage />} />
  </Routes>
);

const templatesSubPage = SubPageBlueprint.make({
  name: 'templates',
  // Explicit attachment: when a SubPage is registered from a *separate*
  // frontend module (rather than inside the scaffolder plugin itself),
  // SubPageBlueprint.make can't infer the parent. Without this the
  // subpage never mounts and /create silently falls through to whichever
  // other subpage *is* attached (Tasks, by default), which looks like
  // "the gallery is gone".
  attachTo: { id: 'page:scaffolder', input: 'pages' },
  params: {
    path: 'templates',
    title: 'Templates',
    loader: async () => <TemplatesRouter />,
  },
});

export const scaffolderModule = createFrontendModule({
  pluginId: 'scaffolder',
  extensions: [templatesSubPage],
});
