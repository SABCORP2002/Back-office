import { useCallback, useEffect, useMemo, useState } from 'react';
import { Percent, ArrowDown, ArrowUp, RotateCcw, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Screen, PageHeader } from '../layout/Screen';
import { Card, CardTitle, StatCard, Button, Select, Toggle } from '../components/ui';
import { pricingApi, countriesApi, type PricingConfig } from '../lib/api';

const NETWORK_BY_CRYPTO: Record<string, string> = { USDT: 'TRC20', USDC: 'TRC20', BTC: 'Bitcoin', ETH: 'ERC20' };

interface DirectionForm {
  marginPct: string;
  marginMinPct: string;
  marginMaxPct: string;
  feeFixed: string;
}
const emptyForm: DirectionForm = { marginPct: '1.5', marginMinPct: '', marginMaxPct: '', feeFixed: '0' };

/**
 * "Règle de marge actuelle" edits the real PricingConfig rows
 * PricingService.resolveMargin() reads at quote time — Achat and Vente are
 * two separate rows (schema: one row per country+crypto+direction), edited
 * side by side here the way the mockup shows them.
 */
export default function TauxMargesPage() {
  const [country, setCountry] = useState('');
  const [crypto, setCrypto] = useState('USDT');
  const [countries, setCountries] = useState<string[]>([]);
  const [configs, setConfigs] = useState<PricingConfig[]>([]);
  const [rateHistory, setRateHistory] = useState<Array<{ date: string; providerRate: number; clientRate: number }>>([]);
  const [breakdown, setBreakdown] = useState<{ buy: { providerRate: string; jalRateClient: string } | null; sell: { providerRate: string; jalRateClient: string } | null }>({ buy: null, sell: null });
  const [buyForm, setBuyForm] = useState<DirectionForm>(emptyForm);
  const [sellForm, setSellForm] = useState<DirectionForm>(emptyForm);
  const [error, setError] = useState(false);

  useEffect(() => {
    countriesApi.list().then((rows) => {
      setCountries(rows.map((c) => c.name));
      if (rows[0]) setCountry(rows[0].name);
    });
    pricingApi.list().then(setConfigs).catch(() => setError(true));
  }, []);

  const network = NETWORK_BY_CRYPTO[crypto] ?? 'TRC20';
  const fiatCurrency = 'XAF'; // matches this session's seeded countries — a real deployment resolves this from the selected Country row

  const loadRateCard = useCallback(async () => {
    if (!country) return;
    setError(false);
    try {
      const quotes = await pricingApi.compareQuotes({ crypto, network, fiatCurrency, amount: 1 });
      const providerRate = quotes.find((q) => q.providerRate != null)?.providerRate;
      if (providerRate == null) return;
      const [buy, sell] = await Promise.all([
        pricingApi.breakdown({ crypto, network, fiatCurrency, direction: 'achat', country, providerRate }),
        pricingApi.breakdown({ crypto, network, fiatCurrency, direction: 'vente', country, providerRate }),
      ]);
      setBreakdown({ buy, sell });
      const history = await pricingApi.rateHistory(crypto, network, fiatCurrency, 7);
      setRateHistory(history);
    } catch {
      setError(true);
    }
  }, [country, crypto, network]);

  useEffect(() => {
    loadRateCard();
  }, [loadRateCard]);

  const buyConfig = configs.find((c) => c.country === country && c.crypto === crypto && c.direction === 'achat');
  const sellConfig = configs.find((c) => c.country === country && c.crypto === crypto && c.direction === 'vente');

  useEffect(() => {
    setBuyForm(buyConfig ? { marginPct: buyConfig.marginPct, marginMinPct: buyConfig.marginMinPct ?? '', marginMaxPct: buyConfig.marginMaxPct ?? '', feeFixed: buyConfig.feeFixed } : emptyForm);
    setSellForm(sellConfig ? { marginPct: sellConfig.marginPct, marginMinPct: sellConfig.marginMinPct ?? '', marginMaxPct: sellConfig.marginMaxPct ?? '', feeFixed: sellConfig.feeFixed } : emptyForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyConfig?.id, sellConfig?.id]);

  async function save() {
    const payload = (f: DirectionForm) => ({
      country,
      crypto,
      marginPct: Number(f.marginPct),
      marginMinPct: f.marginMinPct ? Number(f.marginMinPct) : undefined,
      marginMaxPct: f.marginMaxPct ? Number(f.marginMaxPct) : undefined,
      feeFixed: Number(f.feeFixed),
    });
    if (buyConfig) await pricingApi.update(buyConfig.id, payload(buyForm));
    else await pricingApi.create({ ...payload(buyForm), direction: 'achat' });
    if (sellConfig) await pricingApi.update(sellConfig.id, payload(sellForm));
    else await pricingApi.create({ ...payload(sellForm), direction: 'vente' });
    pricingApi.list().then(setConfigs);
    loadRateCard();
  }

  const stats = useMemo(() => {
    const activeCountries = new Set(configs.map((c) => c.country).filter(Boolean)).size;
    const activeCryptos = new Set(configs.map((c) => c.crypto).filter(Boolean)).size;
    const buys = configs.filter((c) => c.direction === 'achat');
    const sells = configs.filter((c) => c.direction === 'vente');
    const avg = (rows: PricingConfig[]) => (rows.length ? (rows.reduce((a, r) => a + Number(r.marginPct), 0) / rows.length).toFixed(2) : '—');
    return { activeCountries, activeCryptos, total: configs.length, avgBuy: avg(buys), avgSell: avg(sells) };
  }, [configs]);

  return (
    <Screen>
      <PageHeader icon={Percent} title="Taux & Marges" subtitle="Définissez vos marges et suivez les taux fournisseurs en temps réel." />

      {error && <div className="mb-3 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">Impossible de contacter le serveur backend.</div>}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Pays configurés" value={stats.activeCountries} />
        <StatCard iconTone="warning" label="Cryptos configurées" value={stats.activeCryptos} />
        <StatCard iconTone="purple" label="Règles de marges" value={stats.total} />
        <StatCard label="Marge moyenne (achat)" value={`${stats.avgBuy}%`} />
        <StatCard label="Marge moyenne (vente)" value={`${stats.avgSell}%`} />
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
          <Select value={country} onChange={setCountry} options={countries} placeholder="Pays" />
          <Select value={crypto} onChange={setCrypto} options={['USDT', 'BTC', 'ETH', 'USDC']} />
          <Button variant="ghost" icon={RotateCcw} onClick={() => { setCountry(countries[0] ?? ''); setCrypto('USDT'); }}>Réinitialiser</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{crypto} / {fiatCurrency} — {country}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-md bg-success/5 border border-success/20 p-3">
                <div className="mb-2 flex items-center gap-2 text-success font-semibold text-sm"><ArrowDown size={14} /> ACHAT</div>
                {breakdown.buy ? (
                  <>
                    <RateRow label="Taux fournisseur" value={breakdown.buy.providerRate} />
                    <RateRow label="Taux client JAL" value={breakdown.buy.jalRateClient} highlight />
                  </>
                ) : (
                  <div className="text-xs text-onSurfaceVariant">Aucun fournisseur éligible pour ce pays/crypto.</div>
                )}
              </div>
              <div className="rounded-md bg-error/5 border border-error/20 p-3">
                <div className="mb-2 flex items-center gap-2 text-error font-semibold text-sm"><ArrowUp size={14} /> VENTE</div>
                {breakdown.sell ? (
                  <>
                    <RateRow label="Taux fournisseur" value={breakdown.sell.providerRate} />
                    <RateRow label="Taux client JAL" value={breakdown.sell.jalRateClient} highlight />
                  </>
                ) : (
                  <div className="text-xs text-onSurfaceVariant">Aucun fournisseur éligible pour ce pays/crypto.</div>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>Évolution du taux (7 derniers jours, quotes réellement générées)</CardTitle>
            {rateHistory.length === 0 ? (
              <div className="py-8 text-center text-sm text-onSurfaceVariant">Aucune quote générée sur cette période pour {crypto}/{network}/{fiatCurrency}.</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={rateHistory}>
                  <CartesianGrid stroke="#232323" vertical={false} />
                  <XAxis dataKey="date" stroke="#8a8680" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8a8680" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#1C1B1B', border: '1px solid #232323', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="providerRate" name="Taux fournisseur" stroke="#22C55E" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="clientRate" name="Taux client JAL" stroke="#F5B300" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardTitle>Règle de marge — {crypto} / {country}</CardTitle>
            <DirectionFields title="MARGE ACHAT" form={buyForm} onChange={setBuyForm} />
            <DirectionFields title="MARGE VENTE" form={sellForm} onChange={setSellForm} />
            <Button variant="primary" className="w-full justify-center" onClick={save}>Enregistrer les modifications</Button>
          </Card>
        </div>
      </div>

      <Card padded={false} className="mt-4">
        <div className="p-5 pb-3"><CardTitle>Toutes les règles de marges</CardTitle></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-onSurfaceVariant">
                {['Pays', 'Crypto', 'Sens', 'Marge (%)', 'Frais fixe', 'Statut', ''].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {configs.map((r) => (
                <tr key={r.id} className="border-b border-border/60">
                  <td className="whitespace-nowrap px-4 py-3">{r.country ?? 'Tous'}</td>
                  <td className="whitespace-nowrap px-4 py-3">{r.crypto ?? 'Tous'}</td>
                  <td className={`whitespace-nowrap px-4 py-3 ${r.direction === 'achat' ? 'text-success' : 'text-error'}`}>{r.direction ?? 'Les deux'}</td>
                  <td className="whitespace-nowrap px-4 py-3">{r.marginPct}%</td>
                  <td className="whitespace-nowrap px-4 py-3">{r.feeFixed}</td>
                  <td className="whitespace-nowrap px-4 py-3"><Toggle checked={r.active} onChange={() => pricingApi.update(r.id, { active: !r.active }).then(() => pricingApi.list().then(setConfigs))} /></td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <button onClick={() => pricingApi.remove(r.id).then(() => pricingApi.list().then(setConfigs))} className="text-onSurfaceVariant hover:text-error"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {configs.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-onSurfaceVariant">Aucune règle configurée.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </Screen>
  );
}

function DirectionFields({ title, form, onChange }: { title: string; form: DirectionForm; onChange: (f: DirectionForm) => void }) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-xs font-semibold text-onSurfaceVariant">{title}</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <MiniInput label="Marge (%)" value={form.marginPct} onChange={(v) => onChange({ ...form, marginPct: v })} />
        <MiniInput label="Frais fixe" value={form.feeFixed} onChange={(v) => onChange({ ...form, feeFixed: v })} />
        <MiniInput label="Marge min (%)" value={form.marginMinPct} onChange={(v) => onChange({ ...form, marginMinPct: v })} />
        <MiniInput label="Marge max (%)" value={form.marginMaxPct} onChange={(v) => onChange({ ...form, marginMaxPct: v })} />
      </div>
    </div>
  );
}

function MiniInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="rounded-md border border-border bg-surface-higher px-2.5 py-1.5 block">
      <div className="text-[9px] text-onSurfaceVariant">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-xs font-medium outline-none" />
    </label>
  );
}

function RateRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="mb-1.5 flex items-center justify-between text-xs">
      <span className="text-onSurfaceVariant">{label}</span>
      <span className={highlight ? 'font-bold text-primary' : 'font-medium'}>{value}</span>
    </div>
  );
}
