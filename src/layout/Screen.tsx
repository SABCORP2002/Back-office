import type { ReactNode } from 'react';
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
    <div className="mb-6 flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2.5">
          <Icon size={24} className="text-primary" />
          <h1 className="text-2xl font-bold text-onSurface">{title}</h1>
        </div>
        <p className="mt-1 text-sm text-onSurfaceVariant">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function Screen({ topbarRight, children }: { topbarRight?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar right={topbarRight} />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-6">{children}</main>
      </div>
    </div>
  );
}
