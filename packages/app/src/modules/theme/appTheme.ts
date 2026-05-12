// packages/app/src/modules/theme/appTheme.ts
// Custom light theme for Backstage
// Warm-paper neutrals + electric lime accent + dark sidebar.
//
// Targets the new declarative frontend system (`@backstage/frontend-defaults`)
// using `@backstage/theme`'s UnifiedTheme APIs. Material UI v4 is the
// underlying component library on this install.

import {
  createUnifiedTheme,
  createBaseThemeOptions,
  palettes,
  genPageTheme,
  shapes,
  UnifiedTheme,
} from '@backstage/theme';

// ── Tokens (single source of truth — mirror these in components.ts) ────────
export const appTokens = {
  bg:          '#f7f6f1',
  surface:     '#ffffff',
  surface2:    '#f1efe7',
  border:      '#e6e2d6',
  borderHard:  '#d8d3c2',

  ink:         '#191a17',
  ink2:        '#3d3f3a',
  mute:        '#737569',

  accent:      '#a8d83a',
  accentInk:   '#191a17',
  accentSoft:  '#e7f4bf',

  ok:          '#3a7a3a',
  warn:        '#a06a16',
  bad:         '#a23a2a',

  // Banner (warm beige replacing the default gradient banners)
  bannerHome:  '#ede8d8',
  bannerCat:   '#e6e0cc',
  bannerDoc:   '#d8d2bc',
  bannerInk:   '#191a17',
  bannerInk2:  '#5a5448',

  // Sidebar (kept dark — operator feel)
  sidebarBg:   '#0f1110',
  sidebarInk:  '#dcdfd6',
  sidebarMute: '#80847a',
};

const sansStack =
  '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const monoStack =
  '"JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, monospace';

export const appTheme: UnifiedTheme = createUnifiedTheme({
  ...createBaseThemeOptions({
    palette: {
      ...palettes.light,
      mode: 'light',
      primary: {
        main: appTokens.ink,
        light: appTokens.ink2,
        dark: '#000000',
      },
      secondary: {
        main: appTokens.accent,
        contrastText: appTokens.accentInk,
      },
      background: {
        default: appTokens.bg,
        paper: appTokens.surface,
      },
      text: {
        primary: appTokens.ink,
        secondary: appTokens.mute,
      },
      status: {
        ok: appTokens.ok,
        warning: appTokens.warn,
        error: appTokens.bad,
        running: appTokens.accent,
        pending: appTokens.warn,
        aborted: appTokens.mute,
      },
      navigation: {
        background: appTokens.sidebarBg,
        indicator: appTokens.accent,
        color: appTokens.sidebarInk,
        selectedColor: appTokens.accent,
        navItem: {
          hoverBackground: 'rgba(168,216,58,0.08)',
        },
        submenu: {
          background: '#1a1d18',
        },
      },
      border: appTokens.border,
      textContrast: appTokens.ink,
      textVerySubtle: appTokens.mute,
      textSubtle: appTokens.ink2,
      highlight: appTokens.accentSoft,
      errorBackground: '#fbe4e0',
      warningBackground: '#fff3dc',
      infoBackground: appTokens.accentSoft,
      errorText: appTokens.bad,
      infoText: appTokens.ink,
      warningText: appTokens.warn,
      linkHover: appTokens.accent,
      link: appTokens.ink,
      gold: appTokens.accent,
      banner: {
        info: appTokens.bannerHome,
        error: '#fbe4e0',
        text: appTokens.ink,
        link: appTokens.ink,
        closeButtonColor: appTokens.ink,
        warning: '#fff3dc',
      },
      bursts: {
        fontColor: appTokens.ink,
        slackChannelText: appTokens.mute,
        backgroundColor: { default: appTokens.bannerHome },
        gradient: { linear: 'none' },
      },
      pinSidebarButton: {
        icon: appTokens.sidebarInk,
        background: appTokens.sidebarBg,
      },
      tabbar: {
        indicator: appTokens.accent,
      },
    },
    fontFamily: sansStack,
    defaultPageTheme: 'home',
    // Page themes: replace gradient banners with flat warm beige surfaces.
    pageTheme: {
      home:          genPageTheme({ colors: [appTokens.bannerHome, appTokens.bannerHome], shape: shapes.wave }),
      documentation: genPageTheme({ colors: [appTokens.bannerDoc,  appTokens.bannerDoc],  shape: shapes.wave2 }),
      tool:          genPageTheme({ colors: [appTokens.bannerCat,  appTokens.bannerCat],  shape: shapes.round }),
      service:       genPageTheme({ colors: [appTokens.bannerCat,  appTokens.bannerCat],  shape: shapes.wave }),
      website:       genPageTheme({ colors: [appTokens.bannerCat,  appTokens.bannerCat],  shape: shapes.wave }),
      library:       genPageTheme({ colors: [appTokens.bannerCat,  appTokens.bannerCat],  shape: shapes.wave }),
      other:         genPageTheme({ colors: [appTokens.bannerCat,  appTokens.bannerCat],  shape: shapes.wave }),
      app:           genPageTheme({ colors: [appTokens.bannerCat,  appTokens.bannerCat],  shape: shapes.wave }),
      apis:          genPageTheme({ colors: [appTokens.bannerCat,  appTokens.bannerCat],  shape: shapes.wave }),
    },
  }),
  fontFamily: sansStack,
  // Typography overrides — mono kicker / uppercase headings, tighter type.
  // BackstageTypography's public schema only allows fontFamily/fontSize/
  // fontWeight/marginBottom on h1–h6 and has no slot at all for body/button/
  // caption/overline. The extras (letterSpacing, textTransform, body sizes)
  // live in MuiTypography styleOverrides below. `button` typography is
  // already covered by the MuiButton overrides further down.
  typography: {
    fontFamily: sansStack,
    htmlFontSize: 16,
    h1: { fontFamily: sansStack, fontWeight: 600, fontSize: 30, marginBottom: 8 },
    h2: { fontFamily: sansStack, fontWeight: 600, fontSize: 24, marginBottom: 6 },
    h3: { fontFamily: sansStack, fontWeight: 600, fontSize: 18, marginBottom: 4 },
    h4: { fontFamily: sansStack, fontWeight: 600, fontSize: 14, marginBottom: 4 },
    h5: { fontFamily: monoStack, fontWeight: 600, fontSize: 11, marginBottom: 0 },
    h6: { fontFamily: monoStack, fontWeight: 600, fontSize: 10, marginBottom: 0 },
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        h1:       { letterSpacing: '-0.01em' },
        h2:       { letterSpacing: '-0.005em' },
        h4:       { textTransform: 'uppercase', letterSpacing: '0.06em' },
        h5:       { textTransform: 'uppercase', letterSpacing: '0.1em' },
        h6:       { textTransform: 'uppercase', letterSpacing: '0.12em' },
        body1:    { fontFamily: sansStack, fontSize: 13.5 },
        body2:    { fontFamily: sansStack, fontSize: 12.5 },
        caption:  { fontFamily: monoStack, fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase' },
        overline: { fontFamily: monoStack, fontSize: 10,   letterSpacing: '0.12em', textTransform: 'uppercase' },
      },
    },
    BackstageHeader: {
      styleOverrides: {
        header: () => ({
          paddingBottom: 0,
          boxShadow: 'none',
          borderBottom: `1px solid ${appTokens.borderHard}`,
        }),
        title: () => ({
          color: appTokens.bannerInk,
          fontWeight: 600,
          fontSize: 30,
          letterSpacing: '-0.01em',
        }),
        subtitle: () => ({
          color: appTokens.bannerInk2,
        }),
        type: () => ({
          color: appTokens.ink2,
          fontFamily: monoStack,
          fontSize: 10.5,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }),
      },
    },
    BackstageHeaderTabs: {
      styleOverrides: {
        defaultTab: () => ({
          color: appTokens.bannerInk2,
          fontFamily: sansStack,
          fontSize: 13,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          padding: '10px 0',
          marginRight: 24,
          minWidth: 'auto',
        }),
        selected: () => ({
          color: appTokens.ink,
        }),
        tabsWrapper: () => ({
          borderBottom: `1px solid ${appTokens.borderHard}`,
          paddingLeft: 36,
        }),
        tabRoot: () => ({
          minWidth: 'auto',
        }),
      },
    },
    BackstageContent: {
      styleOverrides: {
        root: () => ({
          background: appTokens.bg,
          padding: 24,
        }),
      },
    },
    BackstageSidebar: {
      styleOverrides: {
        drawer: () => ({
          background: appTokens.sidebarBg,
          borderRight: `1px solid ${appTokens.borderHard}`,
        }),
      },
    },
    BackstageSidebarItem: {
      styleOverrides: {
        root: () => ({
          color: appTokens.sidebarInk,
          '&:hover': {
            background: 'rgba(168,216,58,0.08)',
            color: appTokens.accent,
          },
        }),
        selected: () => ({
          color: appTokens.accent,
          borderLeft: `2px solid ${appTokens.accent}`,
          background: 'rgba(168,216,58,0.08)',
        }),
        label: () => ({
          fontFamily: sansStack,
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.02em',
        }),
      },
    },
    BackstageInfoCard: {
      styleOverrides: {
        headerTitle: () => ({
          fontFamily: sansStack,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.02em',
          color: appTokens.ink,
          textTransform: 'none',
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundColor: appTokens.surface },
        rounded: { borderRadius: 0 },
        elevation1: { boxShadow: 'none', border: `1px solid ${appTokens.border}` },
        elevation2: { boxShadow: 'none', border: `1px solid ${appTokens.border}` },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: appTokens.surface,
          border: `1px solid ${appTokens.border}`,
          boxShadow: 'none',
          borderRadius: 0,
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          borderBottom: `1px solid ${appTokens.border}`,
        },
        title: { fontSize: 13, fontWeight: 600, letterSpacing: '0.02em' },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 16,
          '&:last-child': { paddingBottom: 16 },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          fontWeight: 600,
          padding: '8px 14px',
          fontSize: 12.5,
        },
        // Use `backgroundColor` (not `background` shorthand) so JSS
        // merges with MUI v4's own `backgroundColor` rule rather than
        // sitting alongside it. With the shorthand, MUI's rule wins on
        // primary buttons and we get black-on-black (palette.primary.main
        // is `ink`, our text override is `accentInk` — both near-black).
        containedPrimary: {
          backgroundColor: appTokens.accent,
          color: appTokens.accentInk,
          boxShadow: 'none',
          '&:hover': { backgroundColor: '#b9e34d', boxShadow: 'none' },
          // Default MUI v4 disabled state for contained buttons drops
          // both bg and text to translucent black; that reads as
          // "black blob" on light surfaces. Give it a readable muted look.
          '&$disabled': {
            backgroundColor: appTokens.surface2,
            color: appTokens.mute,
          },
        },
        outlined: {
          border: `1px solid ${appTokens.borderHard}`,
          color: appTokens.ink,
          '&:hover': { backgroundColor: appTokens.surface2, border: `1px solid ${appTokens.borderHard}` },
        },
        text: { color: appTokens.ink },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: monoStack,
          fontSize: 10,
          height: 22,
          borderRadius: 0,
          background: appTokens.accentSoft,
          color: appTokens.ink2,
          letterSpacing: '0.04em',
          textTransform: 'lowercase',
          padding: '0 6px',
        },
        outlined: {
          background: appTokens.surface2,
          border: `1px solid ${appTokens.borderHard}`,
        },
        label: { padding: '0 6px' },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: { background: appTokens.surface2 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${appTokens.border}`,
          padding: '10px 14px',
          fontSize: 12.5,
        },
        head: {
          color: appTokens.mute,
          fontWeight: 600,
          fontFamily: monoStack,
          fontSize: 10,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '8px 14px',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:nth-of-type(even)': { background: 'transparent' },
          '&:nth-of-type(odd)':  { background: appTokens.surface },
          '&:hover': { background: appTokens.surface2 },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { minWidth: 'auto', padding: '10px 0', marginRight: 24 },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: appTokens.ink, height: 2 },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: { fontFamily: monoStack, fontSize: 12 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 0 },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: appTokens.borderHard,
          '&$checked': { color: appTokens.accent },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: appTokens.ink,
          textDecorationColor: appTokens.borderHard,
          '&:hover': { color: appTokens.accent, textDecorationColor: appTokens.accent },
        },
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: { fontSize: 18 },
      },
    },
    CatalogReactUserListPicker: {
      styleOverrides: {
        title: () => ({
          fontFamily: monoStack,
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: appTokens.mute,
          fontWeight: 600,
        }),
      },
    },
  },
});
