# Elliott theme — install into your Backstage repo

This folder contains the files that apply the **Elliott** light theme to your
Backstage install. Drop them into `packages/app/` matching the paths below.

## Files

```
packages/app/src/
├── App.tsx                          # ⚠ replace existing — adds themeModule
├── modules/
│   ├── nav/
│   │   ├── LogoIcon.tsx             # ⚠ replace — Elliott "E" mark
│   │   └── LogoFull.tsx             # ⚠ replace — Elliott wordmark
│   └── theme/                       # ➕ new folder
│       ├── elliottTheme.ts          # ➕ new — palette, typography, page themes
│       └── index.tsx                # ➕ new — themeModule + ThemeBlueprint
```

## Install

```sh
# from backstage repo root
mkdir -p packages/app/src/modules/theme
cp <this-folder>/packages/app/src/modules/theme/* packages/app/src/modules/theme/
cp <this-folder>/packages/app/src/modules/nav/LogoIcon.tsx packages/app/src/modules/nav/
cp <this-folder>/packages/app/src/modules/nav/LogoFull.tsx packages/app/src/modules/nav/
cp <this-folder>/packages/app/src/App.tsx packages/app/src/App.tsx

yarn install
yarn start
```

If you don't already have `@backstage/theme` in `packages/app/package.json`,
add it (it's transitively present via core-components, but explicit is safer):

```sh
yarn workspace app add @backstage/theme
```

## What the theme does

- **Palette** — warm-paper neutrals (`#f7f6f1` bg / `#fff` surfaces /
  `#e6e2d6` borders), `#a8d83a` lime accent, dark sidebar (`#0f1110`).
- **Page banners** — replaces Backstage's default gradient banners with flat
  warm-beige surfaces (`#ede8d8` for home, `#e6e0cc` for catalog/services,
  `#d8d2bc` for docs).
- **Typography** — Inter for UI / headings, JetBrains Mono for kickers,
  metadata, table headers, captions.
- **Component overrides** — square corners on cards/buttons/chips, mono
  uppercase table headers, lime primary buttons, zebra-striped rows, dark
  sidebar with lime active state.
- **Theme picker** — registers as a third theme alongside the default Light /
  Dark themes Backstage ships. Users select it from Settings → Appearance.
  If you want it to be the **only** theme, see "Make Elliott the only theme"
  below.

## Make Elliott the only theme

By default Backstage's `frontend-defaults` ships Light + Dark themes too.
To remove them, override the core theme extensions in `App.tsx`:

```tsx
import { createApp } from '@backstage/frontend-defaults';
import { coreExtensionData } from '@backstage/frontend-plugin-api';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import { navModule } from './modules/nav';
import { themeModule } from './modules/theme';

export default createApp({
  features: [catalogPlugin, navModule, themeModule],
  // Disable the default themes so Elliott is the only option:
  featureLoader: undefined,
  bindRoutes: undefined,
  // (or simply ship `themeModule` and let users pick — recommended)
});
```

The cleanest way is to add this to `app-config.yaml`:

```yaml
app:
  extensions:
    - theme:app/light: false
    - theme:app/dark: false
    - theme:app/elliott
```

Backstage's declarative system reads that and disables the bundled themes.

## Tuning

All design tokens live at the top of `elliottTheme.ts` as `elliottTokens`.
Change a value there and the whole theme follows.

```ts
export const elliottTokens = {
  bg:         '#f7f6f1',  // app background
  accent:     '#a8d83a',  // lime — buttons, sidebar active, links on hover
  bannerHome: '#ede8d8',  // home banner
  sidebarBg:  '#0f1110',  // sidebar (dark)
  // ...
};
```

## Notes & caveats

- Targets MUI v4 (`@material-ui/core ^4.12.2`) — matches your install.
- Component overrides use the v4 `MuiChip`, `MuiTableCell`, etc. names.
  If you upgrade to MUI v5 / Backstage v2 themes later, the structure stays
  the same but the override keys change (e.g. `MuiChip-root` →
  `styleOverrides: { root: ... }` in `createTheme`).
- The `BackstageSidebar` / `BackstageSidebarItem` overrides assume
  `core-components` v0.18.x. If sidebar styling looks off after install, the
  override class names may have shifted — search core-components source for
  the current name and update.
- The dark sidebar uses Backstage's existing `palette.navigation` slot, so
  `<Sidebar>` / `<SidebarItem>` from core-components pick it up
  automatically without per-component overrides in your nav module.
