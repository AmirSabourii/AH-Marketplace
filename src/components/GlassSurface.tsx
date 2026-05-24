import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

type GlassVariant = 'default' | 'strong' | 'dark' | 'bronze' | 'panel' | 'chip';

const variantClass: Record<GlassVariant, string> = {
  default: 'glass',
  strong:  'glass-strong',
  dark:    'glass-dark',
  bronze:  'glass-bronze',
  panel:   'glass-panel',
  chip:    'glass-chip',
};

interface GlassSurfaceProps {
  children:  ReactNode;
  variant?:  GlassVariant;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'header' | 'footer' | 'nav' | 'aside';
}

export default function GlassSurface({
  children,
  variant = 'default',
  className,
  as: Tag = 'div',
}: GlassSurfaceProps) {
  return <Tag className={cn(variantClass[variant], className)}>{children}</Tag>;
}
