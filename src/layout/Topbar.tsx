import { Menu, Sun, Bell, LogOut, ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/ui';
import { logout } from '../lib/api';
import { getSession } from '../lib/auth';

const ROLE_LABELS: Record<string, string> = {
  SUPPORT: 'Support',
  OPERATIONS: 'Operations',
  FINANCE: 'Finance',
  ADMIN_SYSTEM: 'Super Admin',
};

/** The date-range picker / export button / etc. on the right side of the
 * topbar differs per page (visible in Dashboard, Finance & Rapports,
 * Transactions...) — passed in as `right` rather than hardcoded here. */
export function Topbar({ right, onMenuClick }: { right?: ReactNode; onMenuClick: () => void }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const session = getSession();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-3 sm:h-[68px] sm:px-6">
      <button type="button" onClick={onMenuClick} aria-label="Ouvrir le menu" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-onSurfaceVariant hover:bg-surface-higher hover:text-onSurface lg:hidden">
        <Menu size={20} />
      </button>

      <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-4">
        {right && <div className="flex min-w-0 items-center">{right}</div>}
        <button type="button" aria-label="Changer de theme" className="hidden h-11 w-11 items-center justify-center rounded-md text-onSurfaceVariant hover:bg-surface-higher hover:text-onSurface sm:flex">
          <Sun size={18} />
        </button>
        <button type="button" aria-label="Notifications" className="relative flex h-11 w-11 items-center justify-center rounded-md text-onSurfaceVariant hover:bg-surface-higher hover:text-onSurface">
          <Bell size={18} />
        </button>
        <div className="relative border-l border-border pl-1.5 sm:pl-4">
          <button type="button" aria-label="Menu du compte" className="flex min-h-11 items-center gap-2.5 rounded-md px-1.5 hover:bg-surface-higher" onClick={() => setMenuOpen((v) => !v)}>
            <Avatar name={session?.adminId ?? 'Admin'} size={34} />
            <div className="hidden text-left text-sm leading-tight sm:block">
              <div className="font-semibold text-onSurface">{session ? ROLE_LABELS[session.role] : 'Admin'}</div>
              <div className="text-xs text-onSurfaceVariant">{session?.role ?? ''}</div>
            </div>
            <ChevronDown size={14} className="hidden text-onSurfaceVariant sm:block" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 z-10 w-44 rounded-md border border-border bg-surface-high shadow-lg">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-onSurface hover:bg-surface-higher"
              >
                <LogOut size={14} /> Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
