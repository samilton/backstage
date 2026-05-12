// packages/app/src/modules/nav/LogoIcon.tsx
// Icon mark — lime square with monospaced E. Replaces the default Backstage logo.

export const LogoIcon = () => {
  return (
    <div
      aria-label="Home"
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
