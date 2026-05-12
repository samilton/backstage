// packages/app/src/modules/admin/index.tsx
//
// Admin module — surfaces a small "/admin" area for running the
// developer portal itself.

import {
  createFrontendModule,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';
import { TaskPage } from '@backstage/plugin-scaffolder';
import { AdminLandingPage } from './AdminLandingPage';
import { NewTopicPage } from './topics/NewTopicPage';
import { AcceptedPage } from './topics/AcceptedPage';
import { ApprovalPage } from './topics/ApprovalPage';

const adminPage = PageBlueprint.make({
  name: 'admin',
  params: {
    path: '/admin',
    title: 'Admin',
    noHeader: true,
    loader: async () => <AdminLandingPage />,
  },
});

// /admin/tasks/:taskId — reuse the public TaskPage component from the
// scaffolder plugin. It renders its own Backstage <Page>/<Header> chrome.
const adminTaskPage = PageBlueprint.make({
  name: 'admin-task',
  params: {
    path: '/admin/tasks/:taskId',
    title: 'Task',
    loader: async () => <TaskPage />,
  },
});

const adminNewTopicPage = PageBlueprint.make({
  name: 'admin-topics-new',
  params: {
    path: '/admin/topics/new',
    title: 'New Topic',
    noHeader: true,
    loader: async () => <NewTopicPage />,
  },
});

const adminTopicAcceptedPage = PageBlueprint.make({
  name: 'admin-topics-accepted',
  params: {
    path: '/admin/topics/new/accepted/:requestId',
    title: 'Topic Request Accepted',
    noHeader: true,
    loader: async () => <AcceptedPage />,
  },
});

const adminTopicApprovalPage = PageBlueprint.make({
  name: 'admin-topics-approval',
  params: {
    path: '/admin/topics/approvals/:requestId',
    title: 'Topic Approval',
    noHeader: true,
    loader: async () => <ApprovalPage />,
  },
});

// Same component as the topic approval page; switches its rendered
// fields based on the request's `data.kind`. New route exists so the
// notification deep-link reads `/admin/namespaces/...` for namespace
// requests, matching the URL the bridge router emits.
const adminNamespaceApprovalPage = PageBlueprint.make({
  name: 'admin-namespaces-approval',
  params: {
    path: '/admin/namespaces/approvals/:requestId',
    title: 'Namespace Approval',
    noHeader: true,
    loader: async () => <ApprovalPage />,
  },
});

export const adminModule = createFrontendModule({
  pluginId: 'app',
  extensions: [
    adminPage,
    adminTaskPage,
    adminNewTopicPage,
    adminTopicAcceptedPage,
    adminTopicApprovalPage,
    adminNamespaceApprovalPage,
  ],
});
