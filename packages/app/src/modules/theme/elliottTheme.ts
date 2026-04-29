// packages/app/src/modules/theme/elliottTheme.ts
// Elliott — light theme for Backstage
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
export const elliottTokens = {
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

export const elliottTheme: UnifiedTheme = createUnifiedTheme({
  ...createBaseThemeOptions({
    palette: {
      ...palettes.light,
      mode: 'light',
      primary: {
        main: elliottTokens.ink,
        light: elliottTokens.ink2,
        dark: '#000000',
      },
      secondary: {
        main: elliottTokens.accent,
        contrastText: elliottTokens.accentInk,
      },
      background: {
        default: elliottTokens.bg,
        paper: elliottTokens.surface,
      },
      text: {
        primary: elliottTokens.ink,
        secondary: elliottTokens.mute,
      },
      status: {
        ok: elliottTokens.ok,
        warning: elliottTokens.warn,
        error: elliottTokens.bad,
        running: elliottTokens.accent,
        pending: elliottTokens.warn,
        aborted: elliottTokens.mute,
      },
      navigation: {
        background: elliottTokens.sidebarBg,
        indicator: elliottTokens.accent,
        color: elliottTokens.sidebarInk,
        selectedColor: elliottTokens.accent,
        navItem: {
          hoverBackground: 'rgba(168,216,58,0.08)',
        },
        submenu: {
          background: '#1a1d18',
        },
      },
      border: elliottTokens.border,
      textContrast: elliottTokens.ink,
      textVerySubtle: elliottTokens.mute,
      textSubtle: elliottTokens.ink2,
      highlight: elliottTokens.accentSoft,
      errorBackground: '#fbe4e0',
      warningBackground: '#fff3dc',
      infoBackground: elliottTokens.accentSoft,
      errorText: elliottTokens.bad,
      infoText: elliottTokens.ink,
      warningText: elliottTokens.warn,
      linkHover: elliottTokens.accent,
      link: elliottTokens.ink,
      gold: elliottTokens.accent,
      banner: {
        info: elliottTokens.bannerHome,
        error: '#fbe4e0',
        text: elliottTokens.ink,
        link: elliottTokens.ink,
        closeButtonColor: elliottTokens.ink,
        warning: '#fff3dc',
      },
      bursts: {
        fontColor: elliottTokens.ink,
        slackChannelText: elliottTokens.mute,
        backgroundColor: { default: elliottTokens.bannerHome },
        gradient: { linear: 'none' },
      },
      pinSidebarButton: {
        icon: elliottTokens.sidebarInk,
        background: elliottTokens.sidebarBg,
      },
      tabbar: {
        indicator: elliottTokens.accent,
      },
    },
    fontFamily: sansStack,
    defaultPageTheme: 'home',
    // Page themes: replace gradient banners with flat warm beige surfaces.
    pageTheme: {
      home:          genPageTheme({ colors: [elliottTokens.bannerHome, elliottTokens.bannerHome], shape: shapes.wave }),
      documentation: genPageTheme({ colors: [elliottTokens.bannerDoc,  elliottTokens.bannerDoc],  shape: shapes.wave2 }),
      tool:          genPageTheme({ colors: [elliottTokens.bannerCat,  elliottTokens.bannerCat],  shape: shapes.round }),
      service:       genPageTheme({ colors: [elliottTokens.bannerCat,  elliottTokens.bannerCat],  shape: shapes.wave }),
      website:       genPageTheme({ colors: [elliottTokens.bannerCat,  elliottTokens.bannerCat],  shape: shapes.wave }),
      library:       genPageTheme({ colors: [elliottTokens.bannerCat,  elliottTokens.bannerCat],  shape: shapes.wave }),
      other:         genPageTheme({ colors: [elliottTokens.bannerCat,  elliottTokens.bannerCat],  shape: shapes.wave }),
      app:           genPageTheme({ colors: [elliottTokens.bannerCat,  elliottTokens.bannerCat],  shape: shapes.wave }),
      apis:          genPageTheme({ colors: [elliottTokens.bannerCat,  elliottTokens.bannerCat],  shape: shapes.wave }),
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
          borderBottom: `1px solid ${elliottTokens.borderHard}`,
        }),
        title: () => ({
          color: elliottTokens.bannerInk,
          fontWeight: 600,
          fontSize: 30,
          letterSpacing: '-0.01em',
        }),
        subtitle: () => ({
          color: elliottTokens.bannerInk2,
        }),
        type: () => ({
          color: elliottTokens.ink2,
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
          color: elliottTokens.bannerInk2,
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
          color: elliottTokens.ink,
        }),
        tabsWrapper: () => ({
          borderBottom: `1px solid ${elliottTokens.borderHard}`,
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
          background: elliottTokens.bg,
          padding: 24,
        }),
      },
    },
    BackstageSidebar: {
      styleOverrides: {
        drawer: () => ({
          background: elliottTokens.sidebarBg,
          borderRight: `1px solid ${elliottTokens.borderHard}`,
        }),
      },
    },
    BackstageSidebarItem: {
      styleOverrides: {
        root: () => ({
          color: elliottTokens.sidebarInk,
          '&:hover': {
            background: 'rgba(168,216,58,0.08)',
            color: elliottTokens.accent,
          },
        }),
        selected: () => ({
          color: elliottTokens.accent,
          borderLeft: `2px solid ${elliottTokens.accent}`,
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
          color: elliottTokens.ink,
          textTransform: 'none',
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundColor: elliottTokens.surface },
        rounded: { borderRadius: 0 },
        elevation1: { boxShadow: 'none', border: `1px solid ${elliottTokens.border}` },
        elevation2: { boxShadow: 'none', border: `1px solid ${elliottTokens.border}` },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: elliottTokens.surface,
          border: `1px solid ${elliottTokens.border}`,
          boxShadow: 'none',
          borderRadius: 0,
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          borderBottom: `1px solid ${elliottTokens.border}`,
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
        containedPrimary: {
          background: elliottTokens.accent,
          color: elliottTokens.accentInk,
          boxShadow: 'none',
          '&:hover': { background: '#b9e34d', boxShadow: 'none' },
        },
        outlined: {
          border: `1px solid ${elliottTokens.borderHard}`,
          color: elliottTokens.ink,
          '&:hover': { background: elliottTokens.surface2, border: `1px solid ${elliottTokens.borderHard}` },
        },
        text: { color: elliottTokens.ink },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: monoStack,
          fontSize: 10,
          height: 22,
          borderRadius: 0,
          background: elliottTokens.accentSoft,
          color: elliottTokens.ink2,
          letterSpacing: '0.04em',
          textTransform: 'lowercase',
          padding: '0 6px',
        },
        outlined: {
          background: elliottTokens.surface2,
          border: `1px solid ${elliottTokens.borderHard}`,
        },
        label: { padding: '0 6px' },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: { background: elliottTokens.surface2 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${elliottTokens.border}`,
          padding: '10px 14px',
          fontSize: 12.5,
        },
        head: {
          color: elliottTokens.mute,
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
          '&:nth-of-type(odd)':  { background: elliottTokens.surface },
          '&:hover': { background: elliottTokens.surface2 },
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
        indicator: { backgroundColor: elliottTokens.ink, height: 2 },
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
          color: elliottTokens.borderHard,
          '&$checked': { color: elliottTokens.accent },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: elliottTokens.ink,
          textDecorationColor: elliottTokens.borderHard,
          '&:hover': { color: elliottTokens.accent, textDecorationColor: elliottTokens.accent },
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
          color: elliottTokens.mute,
          fontWeight: 600,
        }),
      },
    },
  },
});
