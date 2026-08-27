import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <Icon size={22} className="shrink-0 text-primary sm:h-6 sm:w-6" />
          <h1 className="text-xl font-bold text-onSurface sm:text-2xl">{title}</h1>
        </div>
        <p className="mt-1 max-w-3xl text-sm leading-5 text-onSurfaceVariant">{subtitle}</p>
      </div>
      {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
    </div>
  );
}

export function Screen({ topbarRight, children }: { topbarRight?: ReactNode; children: ReactNode }) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <Sidebar open={navigationOpen} onClose={() => setNavigationOpen(false)} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar right={topbarRight} onMenuClick={() => setNavigationOpen(true)} />
        <main className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6 sm:pb-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
