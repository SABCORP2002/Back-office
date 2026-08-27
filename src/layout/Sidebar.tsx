import { NavLink } from 'react-router-dom';
import { Globe, Headphones, Headset, Home, Percent, Plug, Repeat, Settings, ShieldCheck, ShieldUser, Users, Wallet, X, Gift } from 'lucide-react';
import clsx from 'clsx';
import { hasPermission, type AdminPermission } from '../lib/auth';

const NAV: Array<{ to: string; label: string; icon: typeof Home; permission: AdminPermission }> = [
  { to: '/', label: 'Dashboard', icon: Home, permission: 'VIEW_DASHBOARD' },
  { to: '/transactions', label: 'Transactions', icon: Repeat, permission: 'VIEW_TRANSACTIONS' },
  { to: '/utilisateurs', label: 'Utilisateurs', icon: Users, permission: 'VIEW_USERS' },
  { to: '/kyc', label: 'KYC & Conformité', icon: ShieldCheck, permission: 'VIEW_KYC' },
  { to: '/fournisseurs', label: 'Fournisseurs', icon: Plug, permission: 'VIEW_PROVIDERS' },
  { to: '/taux-marges', label: 'Taux & Marges', icon: Percent, permission: 'VIEW_PRICING' },
  { to: '/pays-paiements', label: 'Pays & Paiements', icon: Globe, permission: 'VIEW_COUNTRIES_PAYMENTS' },
  { to: '/croissance', label: 'Parrainage & Promos', icon: Gift, permission: 'VIEW_GROWTH_PROGRAMS' },
  { to: '/support', label: 'Support & Litiges', icon: Headphones, permission: 'VIEW_SUPPORT' },
  { to: '/finance', label: 'Finance & Rapports', icon: Wallet, permission: 'VIEW_FINANCIAL_REPORTS' },
  { to: '/admin-utilisateurs', label: 'Administrateurs', icon: ShieldUser, permission: 'VIEW_ADMIN_USERS' },
  { to: '/parametres', label: 'Paramètres & Sécurité', icon: Settings, permission: 'VIEW_PLATFORM_SETTINGS' },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const visibleNav = NAV.filter((item) => hasPermission(item.permission));
  return (
    <>
      {open && <button type="button" aria-label="Fermer le menu" onClick={onClose} className="fixed inset-0 z-40 bg-black/60 lg:hidden" />}
      <aside aria-label="Navigation principale" className={clsx('fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[272px] shrink-0 -translate-x-full flex-col overflow-hidden border-r border-border bg-surface-lowest shadow-2xl transition-transform duration-200 lg:static lg:w-[220px] lg:translate-x-0 lg:shadow-none', open && 'translate-x-0')}>
        <div className="flex items-center gap-2.5 px-5 py-4 lg:py-5">
          <img src="/jal_trade_logo_complete_final.png" alt="JAL Trade" className="h-12 w-10 shrink-0 object-contain object-center" />
          <div className="min-w-0 flex-1"><div className="text-lg font-extrabold leading-none"><span className="text-primary-container">JAL</span> <span className="text-onSurface">TRADE</span></div><div className="text-[9px] font-semibold tracking-wide text-primary/80">JEUNE AFRICAIN LIBRE</div></div>
          <button type="button" aria-label="Fermer le menu" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-md text-onSurfaceVariant hover:bg-surface-higher hover:text-onSurface lg:hidden"><X size={20} /></button>
        </div>
        <nav className="scrollbar-thin min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3">
          {visibleNav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} onClick={onClose} className={({ isActive }) => clsx('flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm transition', isActive ? 'border-l-2 border-primary-container bg-primary-container/10 font-semibold text-primary -ml-[2px] pl-[14px]' : 'text-onSurfaceVariant hover:bg-surface-higher hover:text-onSurface')}><Icon size={17} />{label}</NavLink>)}
        </nav>
        <div className="px-3 pb-3"><div className="flex items-center gap-3 rounded-lg border border-border bg-surface-higher/50 p-3"><Headset size={22} className="shrink-0 text-primary" /><div className="text-xs"><div className="font-semibold text-onSurface">Besoin d'aide ?</div><div className="text-onSurfaceVariant">Contactez le support</div></div></div></div>
        <div className="px-5 pb-5 text-[11px] text-outline">JAL TRADE © 2026<br />Tous droits réservés.</div>
      </aside>
    </>
  );
}
