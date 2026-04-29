// packages/app/src/modules/nav/LogoIcon.tsx
// Elliott "E" mark — lime square with monospaced E. Replaces the default Backstage logo.

export const LogoIcon = () => {
  return (
    <div
      aria-label="Elliott"
      style={{
        width: 32,
        height: 32,
        background: '#a8d83a',
        color: '#191a17',
        display: 'grid',
        placeItems: 'center',
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 16,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      E
    </div>
  );
};
