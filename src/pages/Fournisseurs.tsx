import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Plug, PlusCircle, RefreshCw, Trash2, Eye, Pencil, ArrowUpDown } from 'lucide-react';
import { Screen, PageHeader } from '../layout/Screen';
import { Card, CardTitle, Button, Toggle, Select, SearchInput, Modal, MultiSelect, IconButton } from '../components/ui';
import { Badge } from '../components/Badge';
import {
  providersApi,
  momoProvidersApi,
  paymentProvidersApi,
  routingApi,
  countriesApi,
  type ProviderConfig,
  type MomoProviderConfig,
  type PaymentProviderRow,
  type RoutingRule,
  type Country,
} from '../lib/api';
import { formatDateTime, formatAmount } from '../lib/format';

const CRYPTOS = ['USDT', 'BTC', 'ETH', 'USDC'];
const NETWORKS = ['TRC20', 'ERC20', 'BEP20', 'Bitcoin'];

type ProviderKind = 'crypto' | 'momo';

interface ProviderFormState {
  kind: ProviderKind;
  editingId: string | null;
  readOnly: boolean;
  name: string;
  visibleName: string;
  active: boolean;
  supportedCountries: string[];
  supportedCryptos: string[];
  supportedNetworks: string[];
  countries: string[];
  minimumPayment: string;
  maximumPayment: string;
  notes: string;
}

const EMPTY_FORM: ProviderFormState = {
  kind: 'crypto',
  editingId: null,
  readOnly: false,
  name: '',
  visibleName: '',
  active: true,
  supportedCountries: [],
  supportedCryptos: [],
  supportedNetworks: [],
  countries: [],
  minimumPayment: '',
  maximumPayment: '',
  notes: '',
};

function formatDuration(ms: number | null): string {
  if (ms == null) return 'N/A';
  if (ms < 1000) return `${ms} ms`;
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec} s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec ? `${min} min ${sec} s` : `${min} min`;
}

/**
 * Payment Providers admin — unified crypto + Mobile Money view. Every value
 * here (balance, average time, hasApiKeyConfigured) comes straight from
 * `/admin/payment-providers`, which itself never fabricates: no
 * getBalance() on a provider or zero confirmed transactions both surface
 * as "N/A", never as a placeholder number.
 */
export default function FournisseursPage() {
  const [rows, setRows] = useState<PaymentProviderRow[]>([]);
  const [cryptoProviders, setCryptoProviders] = useState<ProviderConfig[]>([]);
  const [momoProviders, setMomoProviders] = useState<MomoProviderConfig[]>([]);
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [search, setSearch] = useState('');
  const [sortByBalance, setSortByBalance] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<Array<{ providerId: string; name: string; status: string; latencyMs: number | null; error: string | null }>>([]);
  const [newRule, setNewRule] = useState({ country: '', crypto: '', network: '', forcedProviderId: '' });
  const [error, setError] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [modal, setModal] = useState<ProviderFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(false);
    Promise.all([
      paymentProvidersApi.list(search || undefined, sortByBalance ? 'balance' : undefined),
      providersApi.list(),
      momoProvidersApi.list(),
      routingApi.list(),
      countriesApi.list(),
    ])
      .then(([unified, crypto, momo, r, c]) => {
        setRows(unified);
        setCryptoProviders(crypto);
        setMomoProviders(momo);
        setRules(r);
        setCountries(c);
      })
      .catch(() => setError(true));
  }, [search, sortByBalance]);

  // Debounced so typing in "Search Providers" doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function toggleActive(row: PaymentProviderRow) {
    if (row.kind === 'crypto') await providersApi.toggle(row.id, !row.active);
    else await momoProvidersApi.toggle(row.id, !row.active);
    load();
  }

  async function refreshBalance(row: PaymentProviderRow) {
    setRefreshingId(row.id);
    try {
      await paymentProvidersApi.refreshBalance(row.kind, row.id);
      load();
    } finally {
      setRefreshingId(null);
    }
  }

  async function testConnections() {
    setTesting(true);
    try {
      const results = await providersApi.testConnections();
      setTestResults(results);
      load();
    } finally {
      setTesting(false);
    }
  }

  async function addRule() {
    if (!newRule.forcedProviderId) return;
    await routingApi.create({
      country: newRule.country || undefined,
      crypto: newRule.crypto || undefined,
      network: newRule.network || undefined,
      forcedProviderId: newRule.forcedProviderId,
    });
    setNewRule({ country: '', crypto: '', network: '', forcedProviderId: '' });
    load();
  }

  function openCreate() {
    setFormError(null);
    setModal({ ...EMPTY_FORM });
  }

  function openView(row: PaymentProviderRow) {
    openEdit(row, true);
  }

  function openEdit(row: PaymentProviderRow, readOnly = false) {
    setFormError(null);
    if (row.kind === 'crypto') {
      const p = cryptoProviders.find((x) => x.id === row.id);
      if (!p) return;
      setModal({
        kind: 'crypto',
        editingId: p.id,
        readOnly,
        name: p.name,
        visibleName: p.visibleName ?? '',
        active: p.active,
        supportedCountries: p.supportedCountries,
        supportedCryptos: p.supportedCryptos,
        supportedNetworks: p.supportedNetworks,
        countries: [],
        minimumPayment: p.minimumPayment ?? '',
        maximumPayment: p.maximumPayment ?? '',
        notes: p.notes ?? '',
      });
    } else {
      const p = momoProviders.find((x) => x.id === row.id);
      if (!p) return;
      setModal({
        kind: 'momo',
        editingId: p.id,
        readOnly,
        name: p.name,
        visibleName: p.visibleName ?? '',
        active: p.active,
        supportedCountries: [],
        supportedCryptos: [],
        supportedNetworks: [],
        countries: p.countries,
        minimumPayment: p.minimumPayment ?? '',
        maximumPayment: p.maximumPayment ?? '',
        notes: p.notes ?? '',
      });
    }
  }

  async function save() {
    if (!modal) return;
    setFormError(null);
    const minimumPayment = modal.minimumPayment.trim() ? Number(modal.minimumPayment) : undefined;
    const maximumPayment = modal.maximumPayment.trim() ? Number(modal.maximumPayment) : undefined;
    setSaving(true);
    try {
      if (modal.kind === 'crypto') {
        const payload = {
          visibleName: modal.visibleName || undefined,
          supportedCountries: modal.supportedCountries,
          supportedCryptos: modal.supportedCryptos,
          supportedNetworks: modal.supportedNetworks,
          minimumPayment,
          maximumPayment,
          notes: modal.notes || undefined,
        };
        if (modal.editingId) await providersApi.update(modal.editingId, payload);
        else await providersApi.create({ name: modal.name, ...payload });
      } else {
        const payload = {
          visibleName: modal.visibleName || undefined,
          countries: modal.countries,
          minimumPayment,
          maximumPayment,
          notes: modal.notes || undefined,
        };
        if (modal.editingId) await momoProvidersApi.update(modal.editingId, payload);
        else await momoProvidersApi.create({ name: modal.name, active: modal.active, ...payload });
      }
      setModal(null);
      load();
    } catch (err) {
      let message = 'Erreur inconnue';
      if (err instanceof Error) {
        try {
          message = (JSON.parse(err.message) as { message?: string }).message ?? err.message;
        } catch {
          message = err.message;
        }
      }
      setFormError(message);
    } finally {
      setSaving(false);
    }
  }

  const countryOptions = countries.map((c) => ({ value: c.name, label: c.name }));

  return (
    <Screen>
      <PageHeader
        icon={Plug}
        title="Fournisseurs"
        subtitle="Providers crypto et Mobile Money : balance et temps moyen réels, jamais simulés."
        action={
          <Button variant="primary" icon={PlusCircle} onClick={openCreate}>
            Add New Provider
          </Button>
        }
      />

      {error && <div className="mb-3 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">Impossible de contacter le serveur backend.</div>}

      <Card className="mb-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={search} onChange={setSearch} placeholder="Search Providers…" className="w-full sm:w-72" />
          <button
            onClick={() => setSortByBalance((s) => !s)}
            className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-onSurfaceVariant hover:text-onSurface sm:self-auto"
          >
            <ArrowUpDown size={13} /> Trier par balance {sortByBalance ? '(actif)' : ''}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-onSurfaceVariant">
                {['Provider', 'Type', 'Statut', 'Balance', 'Average Time', 'Min / Max', 'Clé API', 'Actif', 'Actions'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.kind}-${r.id}`} className="border-b border-border/60">
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <div className="font-medium">{r.visibleName ?? r.name}</div>
                    {r.visibleName && <div className="text-xs text-onSurfaceVariant">{r.name}</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <Badge tone={r.kind === 'crypto' ? 'primary' : 'info'}>{r.kind === 'crypto' ? 'Crypto' : 'Mobile Money'}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {r.healthStatus == null ? (
                      <span className="text-xs text-onSurfaceVariant" title="Aucun healthCheck() n'existe pour les fournisseurs Mobile Money">
                        Non surveillé
                      </span>
                    ) : (
                      <Badge tone={r.healthStatus === 'UP' ? 'success' : r.healthStatus === 'DEGRADED' ? 'warning' : 'error'}>
                        {r.healthStatus === 'UP' ? 'Opérationnel' : r.healthStatus === 'DEGRADED' ? 'Dégradé' : 'Indisponible'}
                      </Badge>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {r.balanceStatus === 'AVAILABLE' ? (
                        <span className="font-medium" title={r.balanceUpdatedAt ? `Mis à jour : ${formatDateTime(r.balanceUpdatedAt)}` : undefined}>
                          {formatAmount(r.balance!, r.balanceCurrency ?? undefined)}
                        </span>
                      ) : (
                        <span className="text-onSurfaceVariant">N/A</span>
                      )}
                      <button
                        onClick={() => refreshBalance(r)}
                        disabled={refreshingId === r.id}
                        title="Rafraîchir la balance"
                        className="text-onSurfaceVariant hover:text-onSurface disabled:opacity-40"
                      >
                        <RefreshCw size={12} className={refreshingId === r.id ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-onSurfaceVariant">{formatDuration(r.averageTimeMs)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-onSurfaceVariant">
                    {r.minimumPayment != null || r.maximumPayment != null ? `${r.minimumPayment ?? '–'} / ${r.maximumPayment ?? '–'}` : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <Badge tone={r.hasApiKeyConfigured ? 'success' : 'neutral'}>{r.hasApiKeyConfigured ? 'Configurée' : 'Absente'}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <Toggle checked={r.active} onChange={() => toggleActive(r)} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <IconButton icon={Eye} onClick={() => openView(r)} title="Voir" />
                      <IconButton icon={Pencil} onClick={() => openEdit(r)} title="Modifier" />
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-onSurfaceVariant">
                    Aucun fournisseur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardTitle>Règles de routage (forçage manuel par pays/crypto/réseau)</CardTitle>
          <p className="-mt-3 mb-3 text-xs text-onSurfaceVariant">
            Un critère vide s'applique à tous. Sans règle correspondante, le routage automatique choisit selon la priorité et la santé du fournisseur crypto.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-onSurfaceVariant">
                  {['Pays', 'Crypto', 'Réseau', 'Fournisseur forcé', 'Actif', ''].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="whitespace-nowrap px-3 py-2.5">{r.country ?? 'Tous'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-onSurfaceVariant">{r.crypto ?? 'Tous'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-onSurfaceVariant">{r.network ?? 'Tous'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{cryptoProviders.find((p) => p.id === r.forcedProviderId)?.name ?? r.forcedProviderId}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <Toggle checked={r.active} onChange={() => routingApi.setActive(r.id, !r.active).then(load)} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <button onClick={() => routingApi.remove(r.id).then(load)} className="text-onSurfaceVariant hover:text-error">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-onSurfaceVariant">
                      Aucune règle — le routage automatique s'applique partout.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 border-t border-border pt-4 sm:grid-cols-5">
            <input
              placeholder="Pays"
              value={newRule.country}
              onChange={(e) => setNewRule({ ...newRule, country: e.target.value })}
              className="rounded-md border border-border bg-surface-higher px-2 py-1.5 text-xs"
            />
            <input
              placeholder="Crypto"
              value={newRule.crypto}
              onChange={(e) => setNewRule({ ...newRule, crypto: e.target.value })}
              className="rounded-md border border-border bg-surface-higher px-2 py-1.5 text-xs"
            />
            <input
              placeholder="Réseau"
              value={newRule.network}
              onChange={(e) => setNewRule({ ...newRule, network: e.target.value })}
              className="rounded-md border border-border bg-surface-higher px-2 py-1.5 text-xs"
            />
            <Select
              value={newRule.forcedProviderId}
              onChange={(v) => setNewRule({ ...newRule, forcedProviderId: v })}
              options={cryptoProviders.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Fournisseur"
              className="text-xs"
            />
            <Button variant="primary" icon={PlusCircle} onClick={addRule} className="justify-center text-xs">
              Ajouter
            </Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle>Santé des APIs (crypto)</CardTitle>
            <p className="-mt-3 mb-3 text-xs text-onSurfaceVariant">Appelle réellement healthCheck() sur chaque fournisseur crypto enregistré.</p>
            <div className="space-y-2">
              {(testResults.length
                ? testResults
                : cryptoProviders.map((p) => ({ providerId: p.id, name: p.name, status: p.health?.status ?? 'INCONNU', latencyMs: p.health?.avgLatencyMs ?? null, error: null }))
              ).map((r) => (
                <div key={r.providerId} className="flex items-center justify-between rounded-md border border-border p-2.5 text-xs">
                  <span className="font-medium">{r.name}</span>
                  <span className={r.status === 'UP' ? 'text-success' : 'text-error'}>{r.status === 'UP' ? '✓ Connecté' : r.error ?? '● Déconnecté'}</span>
                  <span className="text-onSurfaceVariant">{r.latencyMs != null ? `${r.latencyMs} ms` : '—'}</span>
                </div>
              ))}
            </div>
            <Button icon={RefreshCw} onClick={testConnections} disabled={testing} className="mt-3 w-full justify-center">
              {testing ? 'Test en cours…' : 'Tester toutes les connexions'}
            </Button>
          </Card>
        </div>
      </div>

      {modal && (
        <Modal
          open
          onClose={() => setModal(null)}
          title={modal.readOnly ? 'Provider' : modal.editingId ? 'Modifier le provider' : 'Add New Provider'}
          wide
          footer={
            modal.readOnly ? (
              <Button variant="secondary" onClick={() => setModal({ ...modal, readOnly: false })}>
                Modifier
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setModal(null)}>
                  Annuler
                </Button>
                <Button variant="primary" onClick={save} disabled={saving || !modal.name.trim()}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
              </>
            )
          }
        >
          <div className="space-y-4">
            {formError && <div className="rounded-md border border-error/30 bg-error/10 px-3 py-2 text-xs text-error">{formError}</div>}

            {!modal.editingId && (
              <Field label="Type de provider">
                <Select
                  value={modal.kind}
                  onChange={(v) => setModal({ ...modal, kind: v as ProviderKind })}
                  options={[
                    { value: 'crypto', label: 'Crypto (liquidité)' },
                    { value: 'momo', label: 'Mobile Money' },
                  ]}
                />
              </Field>
            )}

            <Field label="Provider name (interne)">
              <input
                value={modal.name}
                disabled={!!modal.editingId || modal.readOnly}
                onChange={(e) => setModal({ ...modal, name: e.target.value })}
                placeholder="Doit correspondre à l'adapter enregistré (ex : YellowCard, Tranzak)"
                className="w-full rounded-md border border-border bg-surface-higher px-3 py-2 text-sm outline-none focus:border-primary-container/60 disabled:opacity-60"
              />
            </Field>

            <Field label="Visible name (affiché au client)">
              <input
                value={modal.visibleName}
                disabled={modal.readOnly}
                onChange={(e) => setModal({ ...modal, visibleName: e.target.value })}
                className="w-full rounded-md border border-border bg-surface-higher px-3 py-2 text-sm outline-none focus:border-primary-container/60 disabled:opacity-60"
              />
            </Field>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Minimum Payment">
                <input
                  type="number"
                  value={modal.minimumPayment}
                  disabled={modal.readOnly}
                  onChange={(e) => setModal({ ...modal, minimumPayment: e.target.value })}
                  className="w-full rounded-md border border-border bg-surface-higher px-3 py-2 text-sm outline-none focus:border-primary-container/60 disabled:opacity-60"
                />
              </Field>
              <Field label="Maximum Payment">
                <input
                  type="number"
                  value={modal.maximumPayment}
                  disabled={modal.readOnly}
                  onChange={(e) => setModal({ ...modal, maximumPayment: e.target.value })}
                  className="w-full rounded-md border border-border bg-surface-higher px-3 py-2 text-sm outline-none focus:border-primary-container/60 disabled:opacity-60"
                />
              </Field>
            </div>

            {modal.kind === 'crypto' ? (
              <>
                <Field label="Pays supportés">
                  <MultiSelect
                    options={countryOptions}
                    selected={modal.supportedCountries}
                    onChange={(v) => !modal.readOnly && setModal({ ...modal, supportedCountries: v })}
                    label="Sélectionner les pays"
                  />
                </Field>
                <Field label="Cryptos supportées">
                  <MultiSelect
                    options={CRYPTOS.map((c) => ({ value: c, label: c }))}
                    selected={modal.supportedCryptos}
                    onChange={(v) => !modal.readOnly && setModal({ ...modal, supportedCryptos: v })}
                    label="Sélectionner les cryptos"
                  />
                </Field>
                <Field label="Réseaux supportés">
                  <MultiSelect
                    options={NETWORKS.map((n) => ({ value: n, label: n }))}
                    selected={modal.supportedNetworks}
                    onChange={(v) => !modal.readOnly && setModal({ ...modal, supportedNetworks: v })}
                    label="Sélectionner les réseaux"
                  />
                </Field>
              </>
            ) : (
              <Field label="Pays couverts (informatif — supports() dans le code fait autorité)">
                <MultiSelect
                  options={countryOptions}
                  selected={modal.countries}
                  onChange={(v) => !modal.readOnly && setModal({ ...modal, countries: v })}
                  label="Sélectionner les pays"
                />
              </Field>
            )}

            <Field label="Content / Notes (interne — jamais visible du client)">
              <textarea
                value={modal.notes}
                disabled={modal.readOnly}
                onChange={(e) => setModal({ ...modal, notes: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-border bg-surface-higher px-3 py-2 text-sm outline-none focus:border-primary-container/60 disabled:opacity-60"
              />
            </Field>

            <div className="rounded-md border border-border bg-surface-higher px-3 py-2.5 text-xs text-onSurfaceVariant">
              Callback URL : <code>/webhooks/{modal.kind === 'crypto' ? 'provider' : 'momo'}/{modal.editingId ?? '{id}'}</code> — le domaine est fourni par le
              déploiement (jamais codé en dur ici). Clé API / Merchant ID se configurent uniquement côté serveur via <code>.env</code>, jamais dans cette
              interface — voir la colonne « Clé API » du tableau.
            </div>
          </div>
        </Modal>
      )}
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-onSurfaceVariant">{label}</label>
      {children}
    </div>
  );
}
