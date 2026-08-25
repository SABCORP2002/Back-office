import type { ReactNode } from 'react';
import clsx from 'clsx';

export type BadgeTone = 'success' | 'error' | 'warning' | 'info' | 'purple' | 'neutral' | 'primary';

const toneClasses: Record<BadgeTone, string> = {
  success: 'bg-success/15 text-success border-success/30',
  error: 'bg-error/15 text-error border-error/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  info: 'bg-info/15 text-info border-info/30',
  purple: 'bg-purple/15 text-purple border-purple/30',
  neutral: 'bg-surface-highest text-onSurfaceVariant border-border',
  primary: 'bg-primary-container/15 text-primary border-primary-container/30',
};

export function Badge({
  tone = 'neutral',
  children,
  dot = false,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
        toneClasses[tone],
      )}
    >
      {dot && <span className={clsx('h-1.5 w-1.5 rounded-full', `bg-${tone === 'neutral' ? 'outline' : tone}`)} />}
      {children}
    </span>
  );
}

/** Maps the French status labels seen throughout the maquette to a tone,
 * so every table/page derives badge color the same way instead of each
 * screen re-deciding it. */
export function toneForStatus(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (['actif', 'opérationnel', 'approuvé', 'terminée', 'résolu', 'connecté', 'payé', 'vérifié', 'à jour', 'en ligne'].some((k) => s.includes(k))) return 'success';
  if (['rejeté', 'échouée', 'échoué', 'désactivé', 'déconnecté', 'suspendu', 'indisponible'].some((k) => s.includes(k))) return 'error';
  if (['en attente', 'attente', 'moyen', 'maintenance', 'nouveau'].some((k) => s.includes(k))) return 'warning';
  if (['litige', 'élevé', 'haute'].some((k) => s.includes(k))) return 'purple';
  if (['en cours', 'en traitement', 'faible', 'basse'].some((k) => s.includes(k))) return 'info';
  return 'neutral';
}
