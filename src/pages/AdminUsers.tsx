import { useEffect, useMemo, useState } from 'react';
import { KeyRound, LockKeyhole, Plus, ShieldCheck, ShieldUser } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Button, Card, CardTitle } from '../components/ui';
import { Screen, PageHeader } from '../layout/Screen';
import { adminUsersApi, type BackofficeAdmin } from '../lib/api';
import { type AdminPermission, hasPermission } from '../lib/auth';
import { formatDateTime } from '../lib/format';

const ROLES: Array<{ value: BackofficeAdmin['role']; label: string; detail: string }> = [
  { value: 'SUPPORT', label: 'Support', detail: 'Assistance client et traitement des demandes.' },
  { value: 'OPERATIONS', label: 'Opérations', detail: 'Suivi des transactions, KYC et fournisseurs.' },
  { value: 'FINANCE', label: 'Finance', detail: 'Rapports, tarification et remboursements autorisés.' },
  { value: 'ADMIN_SYSTEM', label: 'Super Admin', detail: 'Accès complet et gestion des administrateurs.' },
];

type PermissionDefinition = { value: AdminPermission; label: string; detail: string };
type PermissionGroup = { title: string; detail: string; permissions: PermissionDefinition[] };

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: 'Tableau de bord et rapports',
    detail: 'Visibilité sur l’activité et les analyses de la plateforme.',
    permissions: [
      { value: 'VIEW_DASHBOARD', label: 'Voir le tableau de bord', detail: 'Indicateurs, alertes et tendances générales.' },
      { value: 'VIEW_FINANCIAL_REPORTS', label: 'Voir les rapports financiers', detail: 'Commissions, frais et résultats non-custodiaux.' },
      { value: 'EXPORT_FINANCIAL_REPORTS', label: 'Exporter les rapports financiers', detail: 'Télécharger les rapports financiers au format CSV.' },
      { value: 'VIEW_AUDIT_LOGS', label: 'Voir le journal d’activité', detail: 'Consulter qui a fait quelle action dans le back-office.' },
    ],
  },
  {
    title: 'Transactions',
    detail: 'Consultation, export et actions opérationnelles sur les ordres.',
    permissions: [
      { value: 'VIEW_TRANSACTIONS', label: 'Voir les transactions', detail: 'Lire les opérations, leurs montants, statuts et détails.' },
      { value: 'EXPORT_TRANSACTIONS', label: 'Exporter les transactions', detail: 'Télécharger la liste des transactions au format CSV.' },
      { value: 'INTERVENE_TRANSACTIONS', label: 'Intervenir sur une transaction', detail: 'Relancer une vérification ou corriger un statut avec justification.' },
      { value: 'FORCE_TRANSACTION_PROVIDER', label: 'Choisir un fournisseur', detail: 'Forcer un fournisseur sur une transaction à traiter.' },
      { value: 'ISSUE_REFUND', label: 'Lancer un remboursement', detail: 'Déclencher ou finaliser un remboursement soumis au contrôle requis.' },
      { value: 'VIEW_RECONCILIATION', label: 'Voir le rapprochement', detail: 'Consulter les contrôles de cohérence des transactions.' },
    ],
  },
  {
    title: 'Clients, KYC et support',
    detail: 'Accès séparés pour éviter d’exposer plus de données clients que nécessaire.',
    permissions: [
      { value: 'VIEW_USERS', label: 'Voir les utilisateurs', detail: 'Voir les profils, statuts et historique des clients.' },
      { value: 'MANAGE_USERS', label: 'Gérer les utilisateurs', detail: 'Suspendre, réactiver, modifier le palier ou ajouter une note.' },
      { value: 'VIEW_KYC', label: 'Voir les dossiers KYC', detail: 'Consulter les documents et l’état de vérification.' },
      { value: 'REVIEW_KYC', label: 'Traiter les dossiers KYC', detail: 'Approuver, rejeter, demander des informations ou ajuster le risque.' },
      { value: 'VIEW_SUPPORT', label: 'Voir les tickets support', detail: 'Lire les demandes, litiges et informations associées.' },
      { value: 'MANAGE_SUPPORT', label: 'Gérer les tickets support', detail: 'Modifier un statut ou ajouter une note de suivi.' },
    ],
  },
  {
    title: 'Fournisseurs, taux et couverture',
    detail: 'Paramètres qui influencent les paiements proposés aux clients.',
    permissions: [
      { value: 'VIEW_PROVIDERS', label: 'Voir les fournisseurs', detail: 'Consulter les intégrations et leur état de fonctionnement.' },
      { value: 'MANAGE_PROVIDERS', label: 'Gérer les fournisseurs', detail: 'Créer, modifier, activer, désactiver ou tester un fournisseur.' },
      { value: 'VIEW_PRICING', label: 'Voir les taux et marges', detail: 'Consulter les cotations et la configuration de prix.' },
      { value: 'MANAGE_PRICING', label: 'Modifier les taux et marges', detail: 'Créer ou modifier les marges et frais appliqués.' },
      { value: 'VIEW_COUNTRIES_PAYMENTS', label: 'Voir pays et moyens de paiement', detail: 'Consulter les pays couverts et moyens Mobile Money disponibles.' },
      { value: 'MANAGE_COUNTRIES_PAYMENTS', label: 'Gérer pays et moyens de paiement', detail: 'Ajouter ou modifier la couverture et les moyens de paiement.' },
      { value: 'VIEW_ROUTING', label: 'Voir les règles de routage', detail: 'Consulter la logique de sélection des fournisseurs.' },
      { value: 'MANAGE_ROUTING', label: 'Modifier les règles de routage', detail: 'Créer, activer ou supprimer une règle de routage.' },
      { value: 'VIEW_GROWTH_PROGRAMS', label: 'Voir parrainage et promos', detail: 'Consulter les codes, attributions et récompenses de parrainage.' },
      { value: 'MANAGE_GROWTH_PROGRAMS', label: 'Gérer parrainage et promos', detail: 'Configurer les campagnes et approuver les récompenses.' },
      { value: 'SETTLE_GROWTH_REWARDS', label: 'Régler les récompenses externes', detail: 'Enregistrer un règlement externe avec sa référence de preuve.' },
      { value: 'REVIEW_AMBASSADOR_APPLICATIONS', label: 'Examiner les candidatures Ambassadeur', detail: 'Approuver ou refuser un profil Ambassadeur après examen de ses liens de réseaux sociaux.' },
      { value: 'MANAGE_AMBASSADOR_PROGRAM', label: 'Gérer le programme Ambassadeur', detail: 'Définir la remise, les limites et la durée applicables aux codes Ambassadeur.' },
    ],
  },
  {
    title: 'Plateforme et administrateurs',
    detail: 'Droits réservés aux responsables de la sécurité de la plateforme.',
    permissions: [
      { value: 'VIEW_PLATFORM_SETTINGS', label: 'Voir les réglages plateforme', detail: 'Consulter les paramètres généraux et de sécurité.' },
      { value: 'MANAGE_PLATFORM_SETTINGS', label: 'Modifier les réglages plateforme', detail: 'Modifier les paramètres généraux, notifications et sécurité.' },
      { value: 'VIEW_ADMIN_USERS', label: 'Voir les administrateurs', detail: 'Consulter les comptes administrateurs et leurs droits.' },
      { value: 'MANAGE_ADMIN_USERS', label: 'Gérer les administrateurs', detail: 'Créer, modifier, désactiver ou réinitialiser un compte administrateur.' },
    ],
  },
];

const EMPTY_ROLE_ALLOWED: Record<BackofficeAdmin['role'], AdminPermission[]> = { SUPPORT: [], OPERATIONS: [], FINANCE: [], ADMIN_SYSTEM: [] };

function roleLabel(role: BackofficeAdmin['role']) {
  return ROLES.find((item) => item.value === role)?.label ?? role;
}

type FormState = { email: string; displayName: string; password: string; role: BackofficeAdmin['role']; permissions: AdminPermission[] };
const newForm = (): FormState => ({ email: '', displayName: '', password: '', role: 'SUPPORT', permissions: [] });

export default function AdminUsersPage() {
  const canManage = hasPermission('MANAGE_ADMIN_USERS');
  const [admins, setAdmins] = useState<BackofficeAdmin[]>([]);
  const [form, setForm] = useState<FormState>(newForm);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<BackofficeAdmin['role']>('SUPPORT');
  const [editPermissions, setEditPermissions] = useState<AdminPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [roleAllowed, setRoleAllowed] = useState<Record<BackofficeAdmin['role'], AdminPermission[]>>(EMPTY_ROLE_ALLOWED);

  const allowedPermissions = (role: BackofficeAdmin['role']) => roleAllowed[role];

  const selected = useMemo(() => admins.find((admin) => admin.id === selectedId) ?? null, [admins, selectedId]);
  const load = () => {
    setLoading(true);
    adminUsersApi.list().then(setAdmins).catch(() => setError('Impossible de charger les administrateurs.')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // The permission checklist's options come straight from the backend's
  // PERMISSION_MATRIX (never hand-copied) — pre-fill the create form's
  // default SUPPORT selection once it arrives.
  useEffect(() => {
    adminUsersApi.permissionMatrix().then((matrix) => {
      setRoleAllowed(matrix);
      setForm((current) => (current.role === 'SUPPORT' && current.permissions.length === 0 ? { ...current, permissions: matrix.SUPPORT } : current));
    }).catch(() => setError('Impossible de charger la matrice des permissions.'));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setEditName(selected.displayName ?? '');
    setEditRole(selected.role);
    setEditPermissions(selected.permissions);
  }, [selected]);

  function setRole(role: BackofficeAdmin['role'], target: 'create' | 'edit') {
    const permissions = allowedPermissions(role);
    if (target === 'create') setForm((current) => ({ ...current, role, permissions }));
    else { setEditRole(role); setEditPermissions(permissions); }
  }

  function togglePermission(permission: AdminPermission, target: 'create' | 'edit') {
    const current = target === 'create' ? form.permissions : editPermissions;
    const next = current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission];
    if (target === 'create') setForm((state) => ({ ...state, permissions: next })); else setEditPermissions(next);
  }

  function setGroupPermissions(group: PermissionGroup, target: 'create' | 'edit', enabled: boolean) {
    const allowed = new Set(target === 'create' ? allowedPermissions(form.role) : allowedPermissions(editRole));
    const groupPermissions = group.permissions.map((item) => item.value).filter((permission) => allowed.has(permission));
    const current = target === 'create' ? form.permissions : editPermissions;
    const next = enabled ? [...new Set([...current, ...groupPermissions])] : current.filter((permission) => !groupPermissions.includes(permission));
    if (target === 'create') setForm((state) => ({ ...state, permissions: next })); else setEditPermissions(next);
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError(null); setNotice(null);
    try {
      await adminUsersApi.create({ email: form.email, password: form.password, role: form.role, displayName: form.displayName || undefined, permissions: form.permissions });
      setForm(newForm()); setNotice('Administrateur créé. Il peut se connecter avec son mot de passe temporaire.'); load();
    } catch { setError('Création impossible. Vérifiez les champs et les accès choisis.'); } finally { setSaving(false); }
  }

  async function saveSelected() {
    if (!selected) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      await adminUsersApi.update(selected.id, { displayName: editName || undefined, role: editRole, permissions: editPermissions });
      setNotice('Accès administrateur mis à jour.'); load();
    } catch { setError('Modification impossible.'); } finally { setSaving(false); }
  }

  async function changeStatus(admin: BackofficeAdmin) {
    setSaving(true); setError(null); setNotice(null);
    try {
      await adminUsersApi.setActive(admin.id, !admin.isActive);
      setNotice(admin.isActive ? 'Compte désactivé et sessions révoquées.' : 'Compte administrateur réactivé.'); load();
    } catch { setError('Le statut du compte ne peut pas être modifié.'); } finally { setSaving(false); }
  }

  async function resetPassword() {
    if (!selected) return;
    const temporaryPassword = window.prompt('Saisissez un mot de passe temporaire (12 caractères minimum).');
    if (!temporaryPassword) return;
    if (temporaryPassword.length < 12) { setError('Le mot de passe temporaire doit contenir au moins 12 caractères.'); return; }
    setSaving(true); setError(null); setNotice(null);
    try {
      await adminUsersApi.resetPassword(selected.id, temporaryPassword);
      setNotice('Mot de passe réinitialisé et sessions existantes révoquées.');
    } catch { setError('Réinitialisation impossible.'); } finally { setSaving(false); }
  }

  const editablePermissions = allowedPermissions(editRole);
  const creationPermissions = allowedPermissions(form.role);

  return (
    <Screen>
      <PageHeader icon={ShieldUser} title="Administrateurs" subtitle="Choisissez précisément ce que chaque équipe peut voir, exporter ou modifier. Tous les changements sont journalisés." />
      {error && <div className="mb-4 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}
      {notice && <div className="mb-4 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{notice}</div>}

      <Card className="mb-4 border-primary/25 bg-primary/5">
        <div className="flex gap-3"><ShieldCheck size={21} className="mt-0.5 shrink-0 text-primary" /><div><div className="font-semibold text-onSurface">Accès précis par action</div><p className="mt-1 text-sm text-onSurfaceVariant">Le rôle applique un profil sécurisé. Cochez ensuite les droits exacts : voir, exporter ou modifier. Les droits les plus sensibles restent réservés aux rôles compatibles.</p></div></div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_500px]">
        <Card padded={false}>
          <div className="flex items-center justify-between border-b border-border p-5"><CardTitle>Comptes administrateurs</CardTitle><span className="text-xs text-onSurfaceVariant">{admins.length} compte(s)</span></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-xs text-onSurfaceVariant">{['Administrateur', 'Rôle', 'Droits actifs', 'Statut', 'Dernière mise à jour', ''].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody>
            {admins.map((admin) => <tr key={admin.id} onClick={() => setSelectedId(admin.id)} className={`cursor-pointer border-b border-border/60 hover:bg-surface-higher/60 ${selectedId === admin.id ? 'bg-surface-higher' : ''}`}><td className="px-4 py-3"><div className="font-medium">{admin.displayName || 'Sans nom'}</div><div className="text-xs text-onSurfaceVariant">{admin.email}</div></td><td className="px-4 py-3">{roleLabel(admin.role)}</td><td className="px-4 py-3"><PermissionCount permissions={admin.permissions} /></td><td className="px-4 py-3"><Badge tone={admin.isActive ? 'success' : 'error'}>{admin.isActive ? 'Actif' : 'Désactivé'}</Badge></td><td className="whitespace-nowrap px-4 py-3 text-xs text-onSurfaceVariant">{formatDateTime(admin.updatedAt)}</td><td className="px-4 py-3">{canManage && <Button type="button" variant={admin.isActive ? 'danger' : 'secondary'} className="px-3 py-1.5 text-xs" disabled={saving} onClick={(event) => { event.stopPropagation(); changeStatus(admin); }}>{admin.isActive ? 'Désactiver' : 'Activer'}</Button>}</td></tr>)}
            {!loading && admins.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-onSurfaceVariant">Aucun administrateur.</td></tr>}
            {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-onSurfaceVariant">Chargement…</td></tr>}
          </tbody></table></div>
        </Card>

        <div className="space-y-4">
          {canManage && <Card>
            <CardTitle action={<Plus size={17} className="text-primary" />}>Ajouter un administrateur</CardTitle>
            <form className="space-y-3" onSubmit={create}>
              <Input label="Nom affiché" value={form.displayName} onChange={(value) => setForm({ ...form, displayName: value })} placeholder="Ex. Équipe Finance" />
              <Input label="E-mail professionnel" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} required />
              <Input label="Mot de passe temporaire" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} required hint="12 caractères minimum" />
              <RoleSelect value={form.role} onChange={(role) => setRole(role, 'create')} />
              <PermissionChecklist role={form.role} selected={form.permissions} allowed={creationPermissions} onToggle={(permission) => togglePermission(permission, 'create')} onGroupChange={(group, enabled) => setGroupPermissions(group, 'create', enabled)} />
              <Button variant="primary" icon={Plus} type="submit" disabled={saving} className="w-full justify-center">Créer le compte</Button>
            </form>
          </Card>}

          {selected && canManage && <Card>
            <CardTitle>{selected.displayName || selected.email}</CardTitle>
            <div className="space-y-3"><Input label="Nom affiché" value={editName} onChange={setEditName} /><RoleSelect value={editRole} onChange={(role) => setRole(role, 'edit')} /><PermissionChecklist role={editRole} selected={editPermissions} allowed={editablePermissions} onToggle={(permission) => togglePermission(permission, 'edit')} onGroupChange={(group, enabled) => setGroupPermissions(group, 'edit', enabled)} /><Button variant="primary" disabled={saving} onClick={saveSelected} className="w-full justify-center">Enregistrer les accès</Button><Button variant="secondary" icon={KeyRound} disabled={saving} onClick={resetPassword} className="w-full justify-center">Réinitialiser le mot de passe</Button></div>
          </Card>}
        </div>
      </div>
    </Screen>
  );
}

function PermissionCount({ permissions }: { permissions: AdminPermission[] }) {
  const groups = PERMISSION_GROUPS.filter((group) => group.permissions.some((permission) => permissions.includes(permission.value)));
  return <div><div className="font-medium text-onSurface">{permissions.length} droit{permissions.length > 1 ? 's' : ''}</div><div className="max-w-44 truncate text-xs text-onSurfaceVariant">{groups.map((group) => group.title).join(' · ') || 'Aucun accès'}</div></div>;
}

function Input({ label, value, onChange, type = 'text', required, placeholder, hint }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string; hint?: string }) {
  return <label className="block text-xs text-onSurfaceVariant"><span>{label}</span><input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1 block w-full rounded-md border border-border bg-surface-higher px-3 py-2 text-sm text-onSurface outline-none focus:border-primary" />{hint && <span className="mt-1 block text-[10px]">{hint}</span>}</label>;
}

function RoleSelect({ value, onChange }: { value: BackofficeAdmin['role']; onChange: (role: BackofficeAdmin['role']) => void }) {
  const active = ROLES.find((role) => role.value === value);
  return <label className="block text-xs text-onSurfaceVariant">Rôle<select value={value} onChange={(event) => onChange(event.target.value as BackofficeAdmin['role'])} className="mt-1 block w-full rounded-md border border-border bg-surface-higher px-3 py-2 text-sm text-onSurface outline-none focus:border-primary">{ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select><span className="mt-1 block text-[10px] text-onSurfaceVariant">{active?.detail}</span></label>;
}

function PermissionChecklist({ role, selected, allowed, onToggle, onGroupChange }: { role: BackofficeAdmin['role']; selected: AdminPermission[]; allowed: AdminPermission[]; onToggle: (permission: AdminPermission) => void; onGroupChange: (group: PermissionGroup, enabled: boolean) => void }) {
  if (role === 'ADMIN_SYSTEM') return <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-primary"><div className="flex items-center gap-2 font-semibold"><LockKeyhole size={14} /> Tous les accès sont actifs</div><p className="mt-1 text-primary/85">Le Super Admin garde les droits de récupération et de gestion de la plateforme.</p></div>;
  return <fieldset><legend className="mb-2 text-xs font-semibold text-onSurface">Accès autorisés <span className="font-normal text-onSurfaceVariant">({selected.length} sélectionné{selected.length > 1 ? 's' : ''})</span></legend><div className="space-y-3">{PERMISSION_GROUPS.map((group) => {
    const visible = group.permissions.filter((permission) => allowed.includes(permission.value));
    if (visible.length === 0) return null;
    const selectedCount = visible.filter((permission) => selected.includes(permission.value)).length;
    return <div key={group.title} className="rounded-md border border-border bg-surface-higher/30 p-3"><div className="mb-2 flex flex-wrap items-start justify-between gap-2"><div><div className="text-xs font-semibold text-onSurface">{group.title}</div><div className="mt-0.5 text-[10px] text-onSurfaceVariant">{group.detail}</div></div><div className="flex items-center gap-2 text-[10px]"><span className="text-onSurfaceVariant">{selectedCount}/{visible.length}</span><button type="button" onClick={() => onGroupChange(group, selectedCount !== visible.length)} className="text-primary hover:underline">{selectedCount === visible.length ? 'Retirer tout' : 'Tout autoriser'}</button></div></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{visible.map((permission) => <label key={permission.value} className="flex cursor-pointer gap-2 rounded-md border border-border/80 bg-surface-low p-2 text-xs hover:border-primary/40"><input type="checkbox" checked={selected.includes(permission.value)} onChange={() => onToggle(permission.value)} className="mt-0.5 h-4 w-4 accent-primary-container" /><span><span className="block font-medium text-onSurface">{permission.label}</span><span className="mt-0.5 block text-[10px] leading-relaxed text-onSurfaceVariant">{permission.detail}</span></span></label>)}</div></div>;
  })}</div></fieldset>;
}
