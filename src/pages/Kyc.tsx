import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Clock, CheckCircle2, XCircle, UserCog, TrendingUp, Eye, X, Copy, MessageCircle } from 'lucide-react';
import { Screen, PageHeader } from '../layout/Screen';
import { Card, StatCard, Select, SearchInput, Button, Avatar, Tabs } from '../components/ui';
import { Badge } from '../components/Badge';
import { kycApi, type KycSubmission } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { hasPermission } from '../lib/auth';

const RISK_LABELS: Record<KycSubmission['riskLevel'], string> = { LOW: 'Faible', MEDIUM: 'Moyen', HIGH: 'Élevé' };
const RISK_TONE: Record<KycSubmission['riskLevel'], 'success' | 'warning' | 'error'> = { LOW: 'success', MEDIUM: 'warning', HIGH: 'error' };
const STATUS_LABELS: Record<KycSubmission['status'], string> = { PENDING: 'En attente', APPROVED: 'Approuvé', REJECTED: 'Rejeté' };
const STATUS_TONE: Record<KycSubmission['status'], 'warning' | 'success' | 'error'> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'error' };

type Tab = 'pending' | 'approved' | 'rejected' | 'manual_review';

/**
 * No ID-document number, birth date, or verification-provider field exists
 * on the real KycSubmission model (TDS's KYC document storage is a
 * deliberate stub — no ID-verification vendor is under contract), and
 * frontDocRef/selfieRef are opaque strings, not real image URLs. Shown as
 * labels rather than fabricated document thumbnails.
 */
export default function KycPage() {
  const canReview = hasPermission('REVIEW_KYC');
  const [tab, setTab] = useState<Tab>('pending');
  const [country, setCountry] = useState('');
  const [docType, setDocType] = useState('');
  const [risk, setRisk] = useState('');
  const [search, setSearch] = useState('');

  const [stats, setStats] = useState<Awaited<ReturnType<typeof kycApi.stats>> | null>(null);
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    kycApi
      .list(tab, { country: country || undefined, documentType: docType || undefined, riskLevel: risk || undefined, search: search || undefined })
      .then((rows) => {
        setSubmissions(rows);
        setSelectedId(rows[0]?.id ?? null);
      })
      .catch(() => setError(true));
  }, [tab, country, docType, risk, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    kycApi.stats().then(setStats);
  }, [tab]);

  const selected = submissions.find((s) => s.id === selectedId) ?? null;

  async function act(action: () => Promise<unknown>) {
    await action();
    load();
    kycApi.stats().then(setStats);
  }

  return (
    <Screen>
      <PageHeader icon={ShieldCheck} title="KYC & Conformité" subtitle="Vérifiez les documents d'identité et gérez la conformité de vos utilisateurs." />

      {error && <div className="mb-3 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">Impossible de contacter le serveur backend.</div>}

      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard icon={Clock} iconTone="warning" label="À vérifier" value={stats?.pending ?? '—'} />
        <StatCard icon={CheckCircle2} iconTone="success" label="Approuvés" value={stats ? stats.approved.toLocaleString('fr-FR') : '—'} />
        <StatCard icon={XCircle} iconTone="error" label="Rejetés" value={stats?.rejected ?? '—'} />
        <StatCard icon={UserCog} iconTone="purple" label="Revue manuelle" value={stats?.manualReview ?? '—'} />
        <StatCard icon={TrendingUp} label="Taux d'approbation" value={stats ? `${stats.approvalRatePct}%` : '—'} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <div className="mb-4">
            <Tabs
              tabs={[
                { key: 'pending', label: 'À vérifier', count: stats?.pending },
                { key: 'approved', label: 'Approuvés', count: stats?.approved },
                { key: 'rejected', label: 'Rejetés', count: stats?.rejected },
                { key: 'manual_review', label: 'Revue manuelle', count: stats?.manualReview },
              ]}
              active={tab}
              onChange={(k) => setTab(k as Tab)}
            />
          </div>

          <Card className="mb-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SearchInput value={country} onChange={setCountry} placeholder="Pays de résidence..." />
              <Select value={docType} onChange={setDocType} options={["carte_identite", 'passeport', 'permis_conduire']} placeholder="Type de document" />
              <Select value={risk} onChange={setRisk} options={[{ value: 'LOW', label: 'Faible' }, { value: 'MEDIUM', label: 'Moyen' }, { value: 'HIGH', label: 'Élevé' }]} placeholder="Niveau de risque" />
              <SearchInput value={search} onChange={setSearch} placeholder="Téléphone ou email..." />
            </div>
          </Card>

          <Card padded={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-onSurfaceVariant">
                    {['Utilisateur', 'Pays', 'Document', "Date d'inscription", 'Niveau de risque', 'Statut', ''].map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedId(d.id)}
                      className={`cursor-pointer border-b border-border/60 hover:bg-surface-higher/40 ${selectedId === d.id ? 'bg-surface-higher/60' : ''}`}
                    >
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={d.user?.phone ?? d.user?.email ?? d.userId} size={30} />
                          <div>
                            <div className="font-medium">{d.user?.phone ?? '—'}</div>
                            <div className="text-xs text-onSurfaceVariant">{d.user?.email ?? '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-onSurfaceVariant">{d.countryOfResidence}</td>
                      <td className="whitespace-nowrap px-4 py-3">{d.documentType}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-onSurfaceVariant">{formatDateTime(d.createdAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3"><Badge tone={RISK_TONE[d.riskLevel]}>{RISK_LABELS[d.riskLevel]}</Badge></td>
                      <td className="whitespace-nowrap px-4 py-3"><Badge tone={STATUS_TONE[d.status]}>{STATUS_LABELS[d.status]}</Badge></td>
                      <td className="whitespace-nowrap px-4 py-3"><Eye size={15} className="text-onSurfaceVariant" /></td>
                    </tr>
                  ))}
                  {submissions.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-onSurfaceVariant">Aucun dossier dans cette catégorie.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {selected && (
          <Card className="h-fit">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Dossier KYC</span>
                <Badge tone={STATUS_TONE[selected.status]}>{STATUS_LABELS[selected.status]}</Badge>
              </div>
              <button onClick={() => setSelectedId(null)} className="text-onSurfaceVariant hover:text-onSurface"><X size={16} /></button>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <Avatar name={selected.user?.phone ?? selected.user?.email ?? selected.userId} size={48} />
              <div>
                <div className="font-semibold">{selected.user?.phone ?? selected.user?.email}</div>
                <div className="text-xs text-onSurfaceVariant">{selected.countryOfResidence}</div>
                <div className="flex items-center gap-1 font-mono text-[11px] text-onSurfaceVariant">{selected.userId} <Copy size={11} /></div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <Row label="Email" value={selected.user?.email ?? '—'} />
              <Row label="Téléphone" value={selected.user?.phone ?? '—'} icon={<MessageCircle size={12} className="text-success" />} />
              <Row label="Nationalité" value={selected.nationality} />
              <Row label="Type de document" value={selected.documentType} />
              <Row label="Niveau de risque" value={<Badge tone={RISK_TONE[selected.riskLevel]}>{RISK_LABELS[selected.riskLevel]}</Badge>} />
              {selected.rejectionReason && <Row label="Motif de rejet" value={selected.rejectionReason} />}
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <div className="mb-2 text-xs font-bold tracking-wide text-onSurfaceVariant">DOCUMENTS SOUMIS</div>
              <div className="grid grid-cols-1 gap-2 text-[10px] text-onSurfaceVariant sm:grid-cols-3">
                <div className="rounded-md border border-border bg-surface-higher p-2 text-center">{selected.frontDocRef ? '✓ Recto' : '— Recto'}</div>
                <div className="rounded-md border border-border bg-surface-higher p-2 text-center">{selected.backDocRef ? '✓ Verso' : '— Verso'}</div>
                <div className="rounded-md border border-border bg-surface-higher p-2 text-center">{selected.selfieRef ? '✓ Selfie' : '— Selfie'}</div>
              </div>
              {canReview && <div className="mt-2 flex gap-2">
                {(['LOW', 'MEDIUM', 'HIGH'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => act(() => kycApi.setRiskLevel(selected.id, r))}
                    className={`rounded-md border px-2 py-1 text-[10px] ${selected.riskLevel === r ? 'border-primary-container bg-primary-container/10 text-primary' : 'border-border text-onSurfaceVariant'}`}
                  >
                    {RISK_LABELS[r]}
                  </button>
                ))}
              </div>}
            </div>

            {selected.status === 'PENDING' && canReview && (
              <div className="mt-4 border-t border-border pt-4">
                <div className="mb-2 text-xs font-bold tracking-wide text-onSurfaceVariant">ACTIONS</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button
                    variant="primary"
                    className="justify-center text-xs"
                    onClick={() => act(() => kycApi.approve(selected.id, 'STANDARD', note || 'Documents conformes'))}
                  >
                    ✓ Approuver
                  </Button>
                  <Button
                    variant="danger"
                    className="justify-center text-xs"
                    onClick={() => {
                      if (!note) return window.alert('Un motif de rejet est requis (dans la note ci-dessous).');
                      act(() => kycApi.reject(selected.id, note));
                    }}
                  >
                    ✕ Rejeter
                  </Button>
                  <Button
                    className="justify-center text-xs"
                    onClick={() => {
                      if (!note) return window.alert('Un message est requis.');
                      act(() => kycApi.requestInfo(selected.id, note));
                    }}
                  >
                    Demander plus
                  </Button>
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Motif / message (requis pour rejeter ou demander plus d'informations)"
                  maxLength={500}
                  className="mt-3 h-16 w-full resize-none rounded-md border border-border bg-surface-higher p-2 text-xs outline-none placeholder:text-outline"
                />
                <div className="text-right text-[10px] text-outline">{note.length}/500</div>
              </div>
            )}
          </Card>
        )}
      </div>
    </Screen>
  );
}

function Row({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-onSurfaceVariant">{label}</span>
      <span className="flex items-center gap-1.5 font-medium">
        {value}
        {icon}
      </span>
    </div>
  );
}
