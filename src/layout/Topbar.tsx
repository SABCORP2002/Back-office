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
export function Topbar({ right }: { right?: ReactNode }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const session = getSession();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-border px-6">
      <button className="text-onSurfaceVariant hover:text-onSurface">
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-4">
        {right}
        <button className="text-onSurfaceVariant hover:text-onSurface">
          <Sun size={18} />
        </button>
        <button className="relative text-onSurfaceVariant hover:text-onSurface">
          <Bell size={18} />
        </button>
        <div className="relative border-l border-border pl-4">
          <button className="flex items-center gap-2.5" onClick={() => setMenuOpen((v) => !v)}>
            <Avatar name={session?.adminId ?? 'Admin'} size={34} />
            <div className="text-left text-sm leading-tight">
              <div className="font-semibold text-onSurface">{session ? ROLE_LABELS[session.role] : 'Admin'}</div>
              <div className="text-xs text-onSurfaceVariant">{session?.role ?? ''}</div>
            </div>
            <ChevronDown size={14} className="text-onSurfaceVariant" />
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
