// packages/app/src/modules/theme/index.tsx
// Custom theme module — registers the theme as a Backstage frontend extension.

import React from 'react';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { ThemeBlueprint } from '@backstage/plugin-app-react';
import { UnifiedThemeProvider } from '@backstage/theme';
import { appTheme } from './appTheme';

const appThemeExtension = ThemeBlueprint.make({
  name: 'custom',
  params: {
    theme: {
      id: 'custom',
      title: 'Custom',
      variant: 'light',
      Provider: ({ children }: { children?: React.ReactNode }) => (
        <UnifiedThemeProvider theme={appTheme} children={children} />
      ),
    },
  },
});

export const themeModule = createFrontendModule({
  pluginId: 'app',
  extensions: [appThemeExtension],

});
