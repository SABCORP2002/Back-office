import { NavLink } from 'react-router-dom';
import {
  Home,
  Repeat,
  Users,
  ShieldCheck,
  Plug,
  Percent,
  Globe,
  Headphones,
  Wallet,
  Settings,
  Headset,
} from 'lucide-react';
import clsx from 'clsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/transactions', label: 'Transactions', icon: Repeat },
  { to: '/utilisateurs', label: 'Utilisateurs', icon: Users },
  { to: '/kyc', label: 'KYC & Conformité', icon: ShieldCheck },
  { to: '/fournisseurs', label: 'Fournisseurs', icon: Plug },
  { to: '/taux-marges', label: 'Taux & Marges', icon: Percent },
  { to: '/pays-paiements', label: 'Pays & Paiements', icon: Globe },
  { to: '/support', label: 'Support & Litiges', icon: Headphones },
  { to: '/finance', label: 'Finance & Rapports', icon: Wallet },
  { to: '/parametres', label: 'Paramètres & Sécurité', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-border bg-surface-lowest">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container text-lg">
          🤝
        </div>
        <div>
          <div className="text-lg font-extrabold leading-none">
            <span className="text-primary-container">JAL</span> <span className="text-onSurface">TRADE</span>
          </div>
          <div className="text-[9px] font-semibold tracking-wide text-primary/80">JEUNE AFRICAIN LIBRE</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 scrollbar-thin overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition',
                isActive
                  ? 'bg-primary-container/10 font-semibold text-primary border-l-2 border-primary-container -ml-[2px] pl-[14px]'
                  : 'text-onSurfaceVariant hover:bg-surface-higher hover:text-onSurface',
              )
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-3">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-higher/50 p-3">
          <Headset size={22} className="text-primary shrink-0" />
          <div className="text-xs">
            <div className="font-semibold text-onSurface">Besoin d'aide ?</div>
            <div className="text-onSurfaceVariant">Contactez le support</div>
          </div>
        </div>
      </div>
      <div className="px-5 pb-5 text-[11px] text-outline">
        JAL TRADE © 2025
        <br />
        Tous droits réservés.
      </div>
    </aside>
  );
}
