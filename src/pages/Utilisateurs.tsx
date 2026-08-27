import { useCallback, useEffect, useState } from 'react';
import { Users, RotateCcw, Eye } from 'lucide-react';
import { Screen, PageHeader } from '../layout/Screen';
import { Card, StatCard, Button, Select, SearchInput, Pagination, Avatar, Tabs } from '../components/ui';
import { Badge } from '../components/Badge';
import { usersApi, type User } from '../lib/api';
import { formatAmount, formatDateTime, timeAgo } from '../lib/format';
import { hasPermission } from '../lib/auth';

const PAGE_SIZE = 10;
const KYC_LABELS: Record<User['kycStatus'], string> = { NOT_STARTED: 'Non démarré', PENDING: 'En attente', APPROVED: 'Approuvé', REJECTED: 'Rejeté' };
const KYC_TONE: Record<User['kycStatus'], 'neutral' | 'warning' | 'success' | 'error'> = { NOT_STARTED: 'neutral', PENDING: 'warning', APPROVED: 'success', REJECTED: 'error' };

type Detail = Awaited<ReturnType<typeof usersApi.detail>>;

/** No `name`/`language`/`timezone` field exists on the real User model (TDS §1 never modeled them) — displayed by phone/email instead, not fabricated. */
export default function UtilisateursPage() {
  const canManageUsers = hasPermission('MANAGE_USERS');
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('');
  const [kyc, setKyc] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [users, setUsers] = useState<User[] | null>(null);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof usersApi.stats>> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [tab, setTab] = useState('info');
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    usersApi
      .list({ country: country || undefined, status: (status as User['status']) || undefined, kycStatus: (kyc as User['kycStatus']) || undefined, search: search || undefined })
      .then((rows) => {
        setUsers(rows);
        if (!selectedId && rows[0]) setSelectedId(rows[0].id);
      })
      .catch(() => setError(true));
  }, [country, status, kyc, search, selectedId]);

  useEffect(() => {
    usersApi.stats().then(setStats).catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, status, kyc, search]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    usersApi.detail(selectedId).then(setDetail).catch(() => setDetail(null));
  }, [selectedId]);

  async function withJustification(action: (justification: string) => Promise<unknown>) {
    const justification = window.prompt('Justification (obligatoire — enregistrée en audit log) :');
    if (!justification) return;
    await action(justification);
    if (selectedId) usersApi.detail(selectedId).then(setDetail);
    load();
  }

  const totalPages = Math.max(1, Math.ceil((users?.length ?? 0) / PAGE_SIZE));
  const pageItems = (users ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Screen>
      <PageHeader icon={Users} title="Utilisateurs" subtitle="Gérez vos utilisateurs, consultez leurs informations et leur activité." />

      {error && <div className="mb-3 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">Impossible de contacter le serveur backend.</div>}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard iconTone="info" label="Utilisateurs totaux" value={stats ? stats.total.toLocaleString('fr-FR') : '—'} />
        <StatCard iconTone="success" label="Nouveaux ce mois" value={stats?.newThisMonth ?? '—'} />
        <StatCard iconTone="purple" label="Utilisateurs actifs" value={stats ? stats.active.toLocaleString('fr-FR') : '—'} />
        <StatCard iconTone="error" label="Suspendus" value={stats?.suspended ?? '—'} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <Card className="mb-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Téléphone ou email..." />
              <Select value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: 'ACTIVE', label: 'Actif' }, { value: 'SUSPENDED', label: 'Suspendu' }]} placeholder="Tous" />
              <Select value={kyc} onChange={(v) => { setKyc(v); setPage(1); }} options={Object.entries(KYC_LABELS).map(([value, label]) => ({ value, label }))} placeholder="Tous (KYC)" />
              <SearchInput value={country} onChange={(v) => { setCountry(v); setPage(1); }} placeholder="Pays..." />
              <Button variant="ghost" icon={RotateCcw} onClick={() => { setCountry(''); setStatus(''); setKyc(''); setSearch(''); setPage(1); }}>Réinitialiser</Button>
            </div>
          </Card>

          <Card padded={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-onSurfaceVariant">
                    {['Utilisateur', 'Pays', 'KYC', 'Statut', 'Txns', 'Volume total', 'Dernière activité', ''].map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedId(u.id)}
                      className={`cursor-pointer border-b border-border/60 hover:bg-surface-higher/40 ${selectedId === u.id ? 'bg-surface-higher/60' : ''}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.phone ?? u.email ?? u.id} size={30} />
                          <div>
                            <div className="font-medium">{u.phone ?? '—'}</div>
                            <div className="text-xs text-onSurfaceVariant">{u.email ?? '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-onSurfaceVariant">{u.country}</td>
                      <td className="whitespace-nowrap px-4 py-3"><Badge tone={KYC_TONE[u.kycStatus]}>{KYC_LABELS[u.kycStatus]}</Badge></td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-success' : 'bg-error'}`} />
                          {u.status === 'ACTIVE' ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{u.transactionCount ?? 0}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatAmount(u.totalVolume ?? '0')}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-onSurfaceVariant">{timeAgo(u.lastActivityAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3"><Eye size={15} className="text-onSurfaceVariant" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 pb-4">
              <Pagination page={page} totalPages={totalPages} totalItems={users?.length ?? 0} pageSize={PAGE_SIZE} onPageChange={setPage} />
            </div>
          </Card>
        </div>

        {detail && (
          <Card className="h-fit">
            <div className="mb-4 flex items-center gap-3">
              <Avatar name={detail.phone ?? detail.email ?? detail.id} size={48} />
              <div>
                <div className="font-semibold">{detail.phone ?? detail.email}</div>
                <Badge tone={detail.status === 'ACTIVE' ? 'success' : 'error'} dot>{detail.status === 'ACTIVE' ? 'Actif' : 'Suspendu'}</Badge>
              </div>
            </div>
            <div className="mb-3 text-xs text-onSurfaceVariant">
              Membre depuis le {formatDateTime(detail.createdAt)} · ID : <span className="font-mono">{detail.id}</span>
            </div>

            <Tabs
              tabs={[
                { key: 'info', label: 'Informations' },
                { key: 'transactions', label: 'Transactions', count: detail.summary.transactionCount },
                { key: 'notes', label: 'Notes', count: detail.adminNotes.length },
              ]}
              active={tab}
              onChange={setTab}
            />

            {tab === 'info' && (
              <div className="mt-4 space-y-2.5 text-sm">
                <Row label="Téléphone" value={detail.phone ?? '—'} />
                <Row label="Email" value={detail.email ?? '—'} />
                <Row label="Pays" value={detail.country} />
                <Row label="Statut KYC" value={<Badge tone={KYC_TONE[detail.kycStatus]}>{KYC_LABELS[detail.kycStatus]}</Badge>} />
                <Row label="Palier KYC" value={detail.kycTier} />

                <div className="mt-4 border-t border-border pt-4">
                  <div className="mb-3 text-xs font-bold tracking-wide text-primary">RÉSUMÉ</div>
                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div><div className="text-xs text-onSurfaceVariant">Transactions</div><div className="text-lg font-bold">{detail.summary.transactionCount}</div></div>
                    <div><div className="text-xs text-onSurfaceVariant">Volume total</div><div className="text-lg font-bold">{formatAmount(detail.summary.totalVolume)}</div></div>
                    <div><div className="text-xs text-onSurfaceVariant">Achats / Ventes</div><div className="text-sm font-medium">{detail.summary.achatCount} / {detail.summary.venteCount}</div></div>
                    <div><div className="text-xs text-onSurfaceVariant">Dernière activité</div><div className="text-xs font-medium">{timeAgo(detail.summary.lastActivityAt)}</div></div>
                  </div>
                </div>

                {canManageUsers && <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {detail.status === 'ACTIVE' ? (
                    <Button variant="danger" className="justify-center text-xs" onClick={() => withJustification((j) => usersApi.suspend(detail.id, j))}>Suspendre le compte</Button>
                  ) : (
                    <Button variant="primary" className="justify-center text-xs" onClick={() => withJustification((j) => usersApi.reactivate(detail.id, j))}>Réactiver le compte</Button>
                  )}
                  <Button className="justify-center text-xs" onClick={() => withJustification((j) => usersApi.requestKyc(detail.id, j))}>Demander nouveau KYC</Button>
                  <Button
                    className="col-span-2 justify-center text-xs"
                    onClick={() => {
                      const note = window.prompt('Note interne :');
                      if (note) usersApi.addNote(detail.id, note).then(() => usersApi.detail(detail.id).then(setDetail));
                    }}
                  >
                    Ajouter une note
                  </Button>
                </div>}
              </div>
            )}
            {tab === 'transactions' && (
              <div className="mt-4 space-y-2 text-xs">
                {detail.transactions.length === 0 && <div className="text-onSurfaceVariant">Aucune transaction.</div>}
                {detail.transactions.map((t) => (
                  <div key={t.jalTransactionId} className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="font-mono text-primary">{t.jalTransactionId}</span>
                    <span>{formatAmount(t.fiatAmountExpected)} {t.fiatCurrency}</span>
                  </div>
                ))}
              </div>
            )}
            {tab === 'notes' && (
              <div className="mt-4 space-y-3 text-xs">
                {detail.adminNotes.length === 0 && <div className="text-onSurfaceVariant">Aucune note.</div>}
                {detail.adminNotes.map((n) => (
                  <div key={n.id} className="rounded-md border border-border bg-surface-higher p-2.5">
                    <div className="mb-1 text-onSurfaceVariant">{n.admin.email} · {formatDateTime(n.createdAt)}</div>
                    <div>{n.note}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-onSurfaceVariant">{label}</span>
      <span className="flex items-center gap-1.5 font-medium">{value}</span>
    </div>
  );
}
