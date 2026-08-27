import { useCallback, useEffect, useMemo, useState } from 'react';
import { Headphones, Plus, ExternalLink } from 'lucide-react';
import { Screen, PageHeader } from '../layout/Screen';
import { Card, StatCard, Button, SearchInput, Avatar, Tabs } from '../components/ui';
import { Badge } from '../components/Badge';
import { supportApi, type SupportTicket } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { hasPermission } from '../lib/auth';

const STATUS_LABELS: Record<SupportTicket['status'], string> = { OPEN: 'Nouveau', IN_PROGRESS: 'En cours', RESOLVED: 'Résolu', ESCALATED: 'Escaladé' };
const STATUS_TONE: Record<SupportTicket['status'], 'warning' | 'info' | 'success' | 'error'> = { OPEN: 'warning', IN_PROGRESS: 'info', RESOLVED: 'success', ESCALATED: 'error' };

/**
 * No priority/type category or client-visible two-way conversation exists
 * on the real SupportTicket model — only subject/description/status and
 * internal admin notes (UX §17: "Notes internes"). Shown honestly as
 * internal notes rather than a fabricated chat thread.
 */
export default function SupportPage() {
  const canManage = hasPermission('MANAGE_SUPPORT');
  const [tab, setTab] = useState<'all' | SupportTicket['status']>('all');
  const [search, setSearch] = useState('');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SupportTicket | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    supportApi
      .search({})
      .then((rows) => {
        setTickets(rows);
        if (!selectedId && rows[0]) setSelectedId(rows[0].id);
      })
      .catch(() => setError(true));
  }, [selectedId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    supportApi.detail(selectedId).then(setDetail);
  }, [selectedId]);

  const filtered = useMemo(
    () =>
      tickets.filter((t) => {
        if (tab !== 'all' && t.status !== tab) return false;
        if (search && !t.subject.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [tickets, tab, search],
  );

  const stats = useMemo(() => {
    const count = (s: SupportTicket['status']) => tickets.filter((t) => t.status === s).length;
    return { open: count('OPEN'), inProgress: count('IN_PROGRESS'), resolved: count('RESOLVED'), escalated: count('ESCALATED'), total: tickets.length };
  }, [tickets]);

  async function setStatus(status: SupportTicket['status']) {
    if (!detail) return;
    await supportApi.updateStatus(detail.id, status);
    supportApi.detail(detail.id).then(setDetail);
    load();
  }

  async function addNote() {
    if (!detail || !note) return;
    await supportApi.addNote(detail.id, note);
    setNote('');
    supportApi.detail(detail.id).then(setDetail);
  }

  return (
    <Screen>
      <PageHeader icon={Headphones} title="Support & Litiges" subtitle="Gérez les demandes d'assistance liées aux transactions." />

      {error && <div className="mb-3 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">Impossible de contacter le serveur backend.</div>}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Nouveaux" value={stats.open} />
        <StatCard iconTone="info" label="En cours" value={stats.inProgress} />
        <StatCard iconTone="error" label="Escaladés" value={stats.escalated} />
        <StatCard iconTone="success" label="Résolus" value={stats.resolved} />
        <StatCard label="Total" value={stats.total} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div>
          <div className="mb-4">
            <Tabs
              tabs={[
                { key: 'all', label: 'Tous les tickets', count: stats.total },
                { key: 'OPEN', label: 'Nouveaux', count: stats.open },
                { key: 'IN_PROGRESS', label: 'En cours', count: stats.inProgress },
                { key: 'RESOLVED', label: 'Résolus', count: stats.resolved },
              ]}
              active={tab}
              onChange={(k) => setTab(k as typeof tab)}
            />
          </div>

          <Card className="mb-4">
            <SearchInput value={search} onChange={setSearch} placeholder="Rechercher par objet..." className="w-full" />
          </Card>

          <Card padded={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-onSurfaceVariant">
                    {['Utilisateur', 'Transaction', 'Objet', 'Statut', 'Mis à jour'].map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tk) => (
                    <tr
                      key={tk.id}
                      onClick={() => setSelectedId(tk.id)}
                      className={`cursor-pointer border-b border-border/60 hover:bg-surface-higher/40 ${tk.id === selectedId ? 'bg-surface-higher/60' : ''}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2"><Avatar name={tk.user?.phone ?? tk.user?.email ?? tk.userId} size={26} />{tk.user?.phone ?? tk.user?.email ?? '—'}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-primary">{tk.jalTransactionId ?? '—'}</td>
                      <td className="max-w-[220px] truncate px-4 py-3">{tk.subject}</td>
                      <td className="whitespace-nowrap px-4 py-3"><Badge tone={STATUS_TONE[tk.status]}>{STATUS_LABELS[tk.status]}</Badge></td>
                      <td className="whitespace-nowrap px-4 py-3 text-onSurfaceVariant">{formatDateTime(tk.updatedAt)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-onSurfaceVariant">Aucun ticket.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {detail && (
          <Card className="flex h-fit flex-col">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-xs text-primary">{detail.id}</span>
              <Badge tone={STATUS_TONE[detail.status]}>{STATUS_LABELS[detail.status]}</Badge>
            </div>

            <div className="mb-3 flex items-center gap-3">
              <Avatar name={detail.user?.phone ?? detail.user?.email ?? detail.userId} size={44} />
              <div>
                <div className="font-semibold">{detail.user?.phone ?? detail.user?.email}</div>
                <div className="text-xs text-onSurfaceVariant">{detail.user?.country}</div>
              </div>
            </div>

            <div className="mb-4 rounded-md border border-border bg-surface-higher p-3 text-xs">
              <div className="mb-2 text-[11px] font-bold tracking-wide text-onSurfaceVariant">DÉTAILS DU TICKET</div>
              <Row label="Créé le" value={formatDateTime(detail.createdAt)} />
              {detail.jalTransactionId && (
                <Row label="Transaction" value={<span className="flex items-center gap-1 text-primary">{detail.jalTransactionId} <ExternalLink size={10} /></span>} />
              )}
              <Row label="Objet" value={detail.subject} />
              {detail.description && <div className="mt-1 text-onSurfaceVariant">{detail.description}</div>}
            </div>

            <div className="mb-2 text-xs font-bold tracking-wide text-onSurfaceVariant">NOTES INTERNES ({detail.notes?.length ?? 0})</div>
            <div className="mb-3 max-h-40 space-y-2 overflow-y-auto scrollbar-thin">
              {(detail.notes ?? []).map((n) => (
                <div key={n.id} className="rounded-md bg-surface-higher p-2.5 text-xs">
                  <div className="mb-1 flex justify-between font-semibold">
                    <span>{n.authorId}</span>
                    <span className="font-normal text-outline">{formatDateTime(n.createdAt)}</span>
                  </div>
                  {n.note}
                </div>
              ))}
              {(!detail.notes || detail.notes.length === 0) && <div className="text-xs text-onSurfaceVariant">Aucune note.</div>}
            </div>

            {canManage && <div className="mb-3 flex items-center gap-2 rounded-md border border-border bg-surface-higher px-3 py-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ajouter une note interne..."
                className="flex-1 bg-transparent text-xs outline-none placeholder:text-outline"
              />
              <Button variant="primary" icon={Plus} className="px-3 py-1.5 text-xs" onClick={addNote}>Ajouter</Button>
            </div>}

            {canManage && <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button variant="primary" className="justify-center text-xs" onClick={() => setStatus('RESOLVED')}>Marquer résolu</Button>
              <Button className="justify-center text-xs" onClick={() => setStatus('ESCALATED')}>Escalader</Button>
            </div>}
          </Card>
        )}
      </div>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="mb-1 flex justify-between">
      <span className="text-outline">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
