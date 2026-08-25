import type { ReactNode, ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className={clsx('rounded-lg border border-border bg-surface-low', padded && 'p-5', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-onSurface">{children}</h3>
      {action}
    </div>
  );
}

const iconBg: Record<string, string> = {
  primary: 'bg-primary-container/20 text-primary-container',
  info: 'bg-info/20 text-info',
  purple: 'bg-purple/20 text-purple',
  success: 'bg-success/20 text-success',
  error: 'bg-error/20 text-error',
  warning: 'bg-warning/20 text-warning',
};

export function StatCard({
  icon: Icon,
  iconTone = 'primary',
  label,
  value,
  suffix,
  delta,
  deltaLabel = 'vs hier',
  footer,
  onClick,
}: {
  icon?: LucideIcon;
  iconTone?: keyof typeof iconBg;
  label: string;
  value: ReactNode;
  suffix?: string;
  delta?: string;
  deltaLabel?: string;
  footer?: ReactNode;
  onClick?: () => void;
}) {
  const deltaPositive = delta?.trim().startsWith('+');
  const deltaNegative = delta?.trim().startsWith('-');
  return (
    <Card className={clsx(onClick && 'cursor-pointer transition hover:border-outline/40')}>
      <div onClick={onClick}>
        <div className="flex items-start gap-3">
          {Icon && (
            <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', iconBg[iconTone])}>
              <Icon size={18} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold tracking-wide text-onSurfaceVariant uppercase">{label}</div>
            <div className="mt-1 text-2xl font-bold text-onSurface">
              {value} {suffix && <span className="text-sm font-medium text-onSurfaceVariant">{suffix}</span>}
            </div>
          </div>
        </div>
        {(delta || footer) && (
          <div className="mt-2 text-xs">
            {delta && (
              <span className={clsx('font-semibold', deltaPositive && 'text-success', deltaNegative && 'text-error')}>
                {delta} <span className="font-normal text-onSurfaceVariant">{deltaLabel}</span>
              </span>
            )}
            {footer}
          </div>
        )}
      </div>
    </Card>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: LucideIcon;
}

export function Button({ variant = 'secondary', icon: Icon, className, children, ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-primary-container text-primary-onContainer hover:brightness-110 font-semibold',
    secondary: 'bg-surface-higher text-onSurface border border-border hover:border-outline/50',
    ghost: 'text-onSurfaceVariant hover:text-onSurface',
    danger: 'bg-error/15 text-error border border-error/30 hover:bg-error/25',
  };
  return (
    <button
      className={clsx(
        'inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm transition disabled:opacity-40',
        variants[variant],
        className,
      )}
      {...props}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, className, ...props }: { icon: LucideIcon } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        'flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-higher text-onSurfaceVariant transition hover:text-onSurface',
        className,
      )}
      {...props}
    >
      <Icon size={15} />
    </button>
  );
}

export type SelectOption = string | { value: string; label: string };

export function Select({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={clsx(
        'rounded-md border border-border bg-surface-higher px-3 py-2 text-sm text-onSurface outline-none focus:border-primary-container/60',
        className,
      )}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        return (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        );
      })}
    </select>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Rechercher...',
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={clsx(
        'rounded-md border border-border bg-surface-higher px-3 py-2 text-sm text-onSurface outline-none placeholder:text-outline focus:border-primary-container/60',
        className,
      )}
    />
  );
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
        checked ? 'bg-success' : 'bg-surface-highest',
      )}
    >
      <span
        className={clsx(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

export function Avatar({ name, src, size = 36 }: { name: string; src?: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  if (src) {
    return <img src={src} alt={name} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-surface-highest text-xs font-semibold text-onSurfaceVariant"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-6 border-b border-border">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={clsx(
            'flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition',
            active === t.key
              ? 'border-primary-container text-primary'
              : 'border-transparent text-onSurfaceVariant hover:text-onSurface',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={clsx(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                active === t.key ? 'bg-primary-container/20 text-primary' : 'bg-surface-highest text-onSurfaceVariant',
              )}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  return (
    <div className="flex items-center justify-between pt-4 text-sm text-onSurfaceVariant">
      <span>
        Affichage {start} à {end} sur {totalItems} résultats
      </span>
      <div className="flex items-center gap-1">
        <PageBtn onClick={() => onPageChange(1)} disabled={page === 1}>
          «
        </PageBtn>
        <PageBtn onClick={() => onPageChange(page - 1)} disabled={page === 1}>
          ‹
        </PageBtn>
        <span className="mx-1 flex h-8 w-8 items-center justify-center rounded-md bg-primary-container font-semibold text-primary-onContainer">
          {page}
        </span>
        <PageBtn onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
          ›
        </PageBtn>
        <PageBtn onClick={() => onPageChange(totalPages)} disabled={page === totalPages}>
          »
        </PageBtn>
      </div>
    </div>
  );
}

function PageBtn({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-onSurfaceVariant transition hover:text-onSurface disabled:opacity-30"
      {...props}
    >
      {children}
    </button>
  );
}
