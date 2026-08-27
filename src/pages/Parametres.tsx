import { useEffect, useState } from 'react';
import { Settings, ShieldCheck, Laptop2 } from 'lucide-react';
import { Screen, PageHeader } from '../layout/Screen';
import { Card, CardTitle, Button, Toggle } from '../components/ui';
import { settingsApi, authApi } from '../lib/api';
import { formatDateTime } from '../lib/format';

type PlatformSettings = Awaited<ReturnType<typeof settingsApi.get>>;
type Session = Awaited<ReturnType<typeof authApi.sessions>>[number];
type ActivityLog = Awaited<ReturnType<typeof settingsApi.activityLogs>>[number];

const NOTIF_FIELDS: Array<{ key: keyof PlatformSettings; label: string; sub: string }> = [
  { key: 'notifyNewTransactions', label: 'Nouvelles transactions', sub: 'Recevoir une notification pour chaque nouvelle transaction.' },
  { key: 'notifyNewUsers', label: 'Nouveaux utilisateurs', sub: "Recevoir une notification lors d'une nouvelle inscription." },
  { key: 'notifyKycSubmitted', label: 'KYC soumis', sub: "Être notifié lorsqu'un utilisateur soumet un document KYC." },
  { key: 'notifyDisputes', label: 'Litiges ouverts', sub: 'Recevoir une notification pour les nouveaux tickets.' },
  { key: 'notifyDailyReports', label: 'Rapports quotidiens', sub: 'Recevoir le résumé quotidien des performances par email.' },
];

/**
 * "2FA"/"changer le mot de passe"/"Informations système" (version, espace
 * disque, dernière sauvegarde) had no real backing at all — no admin
 * self-service password endpoint, no 2FA, no infra-metrics endpoint — and
 * were dropped rather than shown as fake data. "Sessions" and "Appareils
 * autorisés" turned out to be the same real AdminSession data, merged into
 * one list.
 */
export default function ParametresPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [draft, setDraft] = useState<Partial<PlatformSettings>>({});
  const [sessions, setSessions] = useState<Session[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    settingsApi.get().then((s) => { setSettings(s); setDraft(s); }).catch(() => setError(true));
    authApi.sessions().then(setSessions).catch(() => setError(true));
    settingsApi.activityLogs(50).then(setLogs).catch(() => setError(true));
  }, []);

  async function save() {
    await settingsApi.update(draft);
    settingsApi.get().then((s) => { setSettings(s); setDraft(s); });
  }

  async function toggle(key: 'requireHttps' | 'ipRestriction' | 'notifyNewTransactions' | 'notifyNewUsers' | 'notifyKycSubmitted' | 'notifyDisputes' | 'notifyDailyReports') {
    if (!settings) return;
    const value = !settings[key];
    await settingsApi.update({ [key]: value });
    settingsApi.get().then((s) => { setSettings(s); setDraft(s); });
  }

  return (
    <Screen>
      <PageHeader icon={Settings} title="Paramètres & Sécurité" subtitle="Gérez les paramètres généraux de la plateforme et sécurisez votre compte administrateur." />

      {error && <div className="mb-3 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">Impossible de contacter le serveur backend.</div>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <Card>
            <CardTitle>Informations générales</CardTitle>
            {settings && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nom de la plateforme" value={draft.platformName ?? ''} onChange={(v) => setDraft({ ...draft, platformName: v })} />
                <Field label="Slogan" value={draft.slogan ?? ''} onChange={(v) => setDraft({ ...draft, slogan: v })} />
                <Field label="Email de contact" value={draft.contactEmail ?? ''} onChange={(v) => setDraft({ ...draft, contactEmail: v })} />
                <Field label="Téléphone de contact" value={draft.contactPhone ?? ''} onChange={(v) => setDraft({ ...draft, contactPhone: v })} />
                <Field label="Devise principale" value={draft.primaryCurrency ?? ''} onChange={(v) => setDraft({ ...draft, primaryCurrency: v })} />
                <Field label="Fuseau horaire" value={draft.timezone ?? ''} onChange={(v) => setDraft({ ...draft, timezone: v })} />
                <Field label="Langue par défaut" value={draft.defaultLanguage ?? ''} onChange={(v) => setDraft({ ...draft, defaultLanguage: v })} />
                <Field label="Blocage auto (minutes)" value={String(draft.autoLockMinutes ?? '')} onChange={(v) => setDraft({ ...draft, autoLockMinutes: Number(v) })} />
              </div>
            )}
            <Button variant="primary" className="mt-4" onClick={save}>Enregistrer les modifications</Button>
          </Card>

          <Card>
            <CardTitle>Paramètres de notifications</CardTitle>
            <div className="space-y-3">
              {NOTIF_FIELDS.map((n) => (
                <div key={n.key} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{n.label}</div>
                    <div className="text-xs text-onSurfaceVariant">{n.sub}</div>
                  </div>
                  <Toggle checked={!!settings?.[n.key]} onChange={() => toggle(n.key as Parameters<typeof toggle>[0])} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardTitle>Protection avancée</CardTitle>
            <div className="space-y-3 text-sm">
              <ToggleRow label="Autoriser uniquement HTTPS" sub="Force toutes les connexions via HTTPS." checked={!!settings?.requireHttps} onChange={() => toggle('requireHttps')} />
              <ToggleRow label="Restrictions par adresse IP" sub="Limite l'accès au back-office à des IP autorisées." checked={!!settings?.ipRestriction} onChange={() => toggle('ipRestriction')} />
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Laptop2 size={17} className="text-primary" />
              <span className="text-sm font-semibold">Sessions actives ({sessions.length})</span>
            </div>
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-md border border-border p-2.5 text-xs">
                  <div>
                    <div className="font-medium">{s.userAgent ?? 'Appareil inconnu'}</div>
                    <div className="text-onSurfaceVariant">{s.ipAddress ?? '—'} · {formatDateTime(s.lastSeenAt)}</div>
                  </div>
                  <button onClick={() => authApi.revokeSession(s.id).then(() => authApi.sessions().then(setSessions))} className="text-error">Révoquer</button>
                </div>
              ))}
              {sessions.length === 0 && <div className="text-xs text-onSurfaceVariant">Aucune session active.</div>}
            </div>
          </Card>
        </div>
      </div>

      <Card padded={false} className="mt-4">
        <div className="flex items-center gap-2 p-5 pb-3">
          <ShieldCheck size={17} className="text-primary" />
          <CardTitle>Journaux d'activité récente</CardTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-onSurfaceVariant">
                {['Date & Heure', 'Admin', 'Action', 'Justification', 'IP'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-border/60">
                  <td className="whitespace-nowrap px-4 py-2.5 text-onSurfaceVariant">{formatDateTime(l.performedAt)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">{l.admin.email} <span className="text-onSurfaceVariant">({l.admin.role})</span></td>
                  <td className="whitespace-nowrap px-4 py-2.5">{l.actionType}</td>
                  <td className="max-w-[260px] truncate px-4 py-2.5 text-onSurfaceVariant">{l.justification}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-onSurfaceVariant">{l.ipAddress ?? '—'}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-onSurfaceVariant">Aucune action enregistrée.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </Screen>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="mb-1 text-xs text-onSurfaceVariant">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-border bg-surface-higher px-3 py-2 text-sm outline-none focus:border-primary-container/60" />
    </div>
  );
}

function ToggleRow({ label, sub, checked, onChange }: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        <div className="text-xs text-onSurfaceVariant">{sub}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}
