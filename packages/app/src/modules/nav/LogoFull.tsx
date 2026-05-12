// packages/app/src/modules/nav/LogoFull.tsx
// Full wordmark — lime square mark + text wordmark in mono.

export const LogoFull = () => {
  return (
    <div
      aria-label="Home"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        color: '#dcdfd6',
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          background: '#a8d83a',
          color: '#191a17',
          display: 'grid',
          placeItems: 'center',
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 14,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        E
      </div>
      <span
        style={{
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: '0.08em',
        }}
      >
        PLATFORM
      </span>
    </div>
  );
};
