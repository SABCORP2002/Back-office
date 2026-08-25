import { useCallback, useEffect, useState } from 'react';
import { Plug, PlusCircle, RefreshCw, Trash2 } from 'lucide-react';
import { Screen, PageHeader } from '../layout/Screen';
import { Card, CardTitle, Button, Toggle, Select } from '../components/ui';
import { Badge } from '../components/Badge';
import { providersApi, routingApi, type ProviderConfig, type RoutingRule } from '../lib/api';
import { formatDateTime } from '../lib/format';

const HEALTH_TONE: Record<'UP' | 'DEGRADED' | 'DOWN', 'success' | 'warning' | 'error'> = { UP: 'success', DEGRADED: 'warning', DOWN: 'error' };

/**
 * No per-provider volume/transaction-count aggregation endpoint exists yet
 * (would need a dedicated query — see ARCHITECTURE.md), so this page shows
 * only what the real ProviderConfig/ProviderHealth/RoutingRule tables
 * actually track: coverage, health/latency (from a real healthCheck()
 * call), priority, and routing overrides. The mockup's "volume/txns
 * aujourd'hui per provider" and "webhooks/logs/docs" action buttons had no
 * real backing and were dropped rather than left as fake data or dead links.
 */
export default function FournisseursPage() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<Array<{ providerId: string; name: string; status: string; latencyMs: number | null; error: string | null }>>([]);
  const [newRule, setNewRule] = useState({ country: '', crypto: '', network: '', forcedProviderId: '' });
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setError(false);
    Promise.all([providersApi.list(), routingApi.list()])
      .then(([p, r]) => {
        setProviders(p);
        setRules(r);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleProvider(p: ProviderConfig) {
    await providersApi.toggle(p.id, !p.active);
    load();
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

  return (
    <Screen>
      <PageHeader
        icon={Plug}
        title="Fournisseurs"
        subtitle="Gérez vos fournisseurs de liquidité et suivez leur performance en temps réel."
      />

      {error && <div className="mb-3 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">Impossible de contacter le serveur backend.</div>}

      <div className="mb-4 grid grid-cols-3 gap-4">
        {providers.map((p) => (
          <Card key={p.id} className={p.active ? '' : 'opacity-60'}>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold">{p.name}</span>
              <div className="flex items-center gap-2">
                <Badge tone={p.health ? HEALTH_TONE[p.health.status] : 'neutral'} dot>{p.health?.status ?? 'INCONNU'}</Badge>
                <Toggle checked={p.active} onChange={() => toggleProvider(p)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <MiniStat label="Pays actifs" value={p.supportedCountries.length} />
              <MiniStat label="Priorité (routage auto)" value={p.priority} />
              <MiniStat label="Latence API" value={p.health?.avgLatencyMs != null ? `${p.health.avgLatencyMs} ms` : '—'} />
              <MiniStat label="Dernier check" value={p.health?.lastCheckAt ? formatDateTime(p.health.lastCheckAt) : 'Jamais testé'} small />
            </div>
            <div className="mt-2 text-xs text-onSurfaceVariant">
              {p.supportedCryptos.join(', ')} · {p.supportedNetworks.join(', ')}
            </div>
          </Card>
        ))}
        {providers.length === 0 && <div className="col-span-3 text-sm text-onSurfaceVariant">Aucun fournisseur configuré.</div>}
      </div>

      <div className="grid grid-cols-[1fr_360px] gap-4">
        <Card>
          <CardTitle>Règles de routage (forçage manuel par pays/crypto/réseau)</CardTitle>
          <p className="-mt-3 mb-3 text-xs text-onSurfaceVariant">
            Un critère vide s'applique à tous. Sans règle correspondante, le routage automatique choisit selon la priorité et la santé du fournisseur.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-onSurfaceVariant">
                  {['Pays', 'Crypto', 'Réseau', 'Fournisseur forcé', 'Actif', ''].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="whitespace-nowrap px-3 py-2.5">{r.country ?? 'Tous'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-onSurfaceVariant">{r.crypto ?? 'Tous'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-onSurfaceVariant">{r.network ?? 'Tous'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{providers.find((p) => p.id === r.forcedProviderId)?.name ?? r.forcedProviderId}</td>
                    <td className="whitespace-nowrap px-3 py-2.5"><Toggle checked={r.active} onChange={() => routingApi.setActive(r.id, !r.active).then(load)} /></td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <button onClick={() => routingApi.remove(r.id).then(load)} className="text-onSurfaceVariant hover:text-error"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {rules.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-onSurfaceVariant">Aucune règle — le routage automatique s'applique partout.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-2 border-t border-border pt-4">
            <input placeholder="Pays" value={newRule.country} onChange={(e) => setNewRule({ ...newRule, country: e.target.value })} className="rounded-md border border-border bg-surface-higher px-2 py-1.5 text-xs" />
            <input placeholder="Crypto" value={newRule.crypto} onChange={(e) => setNewRule({ ...newRule, crypto: e.target.value })} className="rounded-md border border-border bg-surface-higher px-2 py-1.5 text-xs" />
            <input placeholder="Réseau" value={newRule.network} onChange={(e) => setNewRule({ ...newRule, network: e.target.value })} className="rounded-md border border-border bg-surface-higher px-2 py-1.5 text-xs" />
            <Select value={newRule.forcedProviderId} onChange={(v) => setNewRule({ ...newRule, forcedProviderId: v })} options={providers.map((p) => ({ value: p.id, label: p.name }))} placeholder="Fournisseur" className="text-xs" />
            <Button variant="primary" icon={PlusCircle} onClick={addRule} className="justify-center text-xs">Ajouter</Button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardTitle>Santé des APIs</CardTitle>
            <p className="-mt-3 mb-3 text-xs text-onSurfaceVariant">Appelle réellement healthCheck() sur chaque fournisseur enregistré.</p>
            <div className="space-y-2">
              {(testResults.length ? testResults : providers.map((p) => ({ providerId: p.id, name: p.name, status: p.health?.status ?? 'INCONNU', latencyMs: p.health?.avgLatencyMs ?? null, error: null }))).map((r) => (
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
    </Screen>
  );
}

function MiniStat({ label, value, small }: { label: string; value: string | number; small?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-onSurfaceVariant">{label}</div>
      <div className={small ? 'text-[11px] font-medium' : 'text-sm font-semibold'}>{value}</div>
    </div>
  );
}
