// packages/app/src/modules/scaffolder/widgets/TemplateCard.tsx
// Single template card for the gallery grid. Visual language matches
// home/widgets/ScaffoldGrid's cells, expanded for a denser full-page grid.

import { Link } from 'react-router-dom';
import { makeStyles } from '@material-ui/core/styles';
import { appTokens } from '../../theme/appTheme';

export interface GalleryTemplate {
  name: string;
  namespace: string;
  title: string;
  description: string;
  tags: string[];
  type?: string;
  owner?: string;
  uses: number;
}

const useStyles = makeStyles(() => ({
  card: {
    background: appTokens.surface,
    border: `1px solid ${appTokens.border}`,
    padding: '16px 18px',
    display: 'grid',
    gap: 10,
    alignContent: 'start',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'border-color 120ms ease, background 120ms ease',
    '&:hover': {
      borderColor: appTokens.borderHard,
      background: appTokens.surface2,
    },
  },
  head: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  num: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 11,
    color: appTokens.accent,
    letterSpacing: '0.08em',
  },
  uses: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    color: appTokens.mute,
    letterSpacing: '0.08em',
  },
  title: { fontSize: 15, fontWeight: 600, color: appTokens.ink, lineHeight: 1.25 },
  desc: {
    fontSize: 12.5,
    color: appTokens.ink2,
    lineHeight: 1.45,
    minHeight: 36,
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  tag: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.04em',
    background: appTokens.accentSoft,
    color: appTokens.ink2,
    padding: '2px 6px',
  },
  tagOutline: {
    background: appTokens.surface,
    border: `1px solid ${appTokens.border}`,
  },
  cta: {
    marginTop: 6,
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: appTokens.accent,
    fontWeight: 600,
  },
}));

interface TemplateCardProps {
  template: GalleryTemplate;
  index: number;
}

export const TemplateCard = ({ template, index }: TemplateCardProps) => {
  const classes = useStyles();
  const href = `/create/templates/${template.namespace}/${template.name}`;
  return (
    <Link to={href} className={classes.card}>
      <div className={classes.head}>
        <span className={classes.num}>{String(index + 1).padStart(2, '0')}</span>
        <span className={classes.uses}>×{template.uses}</span>
      </div>
      <div className={classes.title}>{template.title}</div>
      <div className={classes.desc}>{template.description || '—'}</div>
      <div className={classes.meta}>
        {template.type && <span className={classes.tag}>{template.type}</span>}
        {template.tags.slice(0, 4).map(t => (
          <span key={t} className={`${classes.tag} ${classes.tagOutline}`}>{t}</span>
        ))}
      </div>
      <div className={classes.cta}>Use template ▸</div>
    </Link>
  );
};
