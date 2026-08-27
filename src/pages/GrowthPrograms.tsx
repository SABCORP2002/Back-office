import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Gift, HandCoins, ShieldCheck, TicketPercent, UserRoundCheck, UsersRound } from 'lucide-react';
import { Badge } from '../components/Badge';
import { Button, Card, CardTitle, StatCard, Toggle } from '../components/ui';
import { PageHeader, Screen } from '../layout/Screen';
import { growthApi, type AmbassadorApplication, type AmbassadorProgramConfig, type GrowthReferral, type GrowthReward, type PromoCampaign, type ReferralProgramConfig } from '../lib/api';
import { hasPermission } from '../lib/auth';
import { formatAmount, formatDateTime } from '../lib/format';

type ReferralDraft = {
  enabled: boolean;
  minimumFiatAmount: string;
  rewardType: 'FIXED_FIAT' | 'PERCENT_OF_JAL_MARGIN';
  rewardValue: string;
  rewardCurrency: string;
  requiresKycApproval: boolean;
  firstCompletedTransaction: boolean;
};

const emptyDraft: ReferralDraft = {
  enabled: false,
  minimumFiatAmount: '',
  rewardType: 'PERCENT_OF_JAL_MARGIN',
  rewardValue: '0',
  rewardCurrency: '',
  requiresKycApproval: true,
  firstCompletedTransaction: true,
};

function draftFrom(config: ReferralProgramConfig | null): ReferralDraft {
  if (!config) return emptyDraft;
  return {
    enabled: config.enabled,
    minimumFiatAmount: config.minimumFiatAmount ?? '',
    rewardType: config.rewardType,
    rewardValue: config.rewardValue,
    rewardCurrency: config.rewardCurrency ?? '',
    requiresKycApproval: config.requiresKycApproval,
    firstCompletedTransaction: config.firstCompletedTransaction,
  };
}

type AmbassadorDraft = {
  enabled: boolean;
  promoBenefitValue: string;
  promoMinimumFiatAmount: string;
  promoMaximumRedemptions: string;
  promoNewUsersOnly: boolean;
  promoFirstCompletedTransaction: boolean;
  promoDurationDays: string;
};

const emptyAmbassadorDraft: AmbassadorDraft = {
  enabled: false,
  promoBenefitValue: '0',
  promoMinimumFiatAmount: '',
  promoMaximumRedemptions: '',
  promoNewUsersOnly: false,
  promoFirstCompletedTransaction: true,
  promoDurationDays: '30',
};

function ambassadorDraftFrom(config: AmbassadorProgramConfig | null): AmbassadorDraft {
  if (!config) return emptyAmbassadorDraft;
  return {
    enabled: config.enabled,
    promoBenefitValue: config.promoBenefitValue,
    promoMinimumFiatAmount: config.promoMinimumFiatAmount ?? '',
    promoMaximumRedemptions: config.promoMaximumRedemptions?.toString() ?? '',
    promoNewUsersOnly: config.promoNewUsersOnly,
    promoFirstCompletedTransaction: config.promoFirstCompletedTransaction,
    promoDurationDays: config.promoDurationDays.toString(),
  };
}

/** Non-custodial referral and promo configuration. */
export default function GrowthProgramsPage() {
  const canManage = hasPermission('MANAGE_GROWTH_PROGRAMS');
  const canSettle = hasPermission('SETTLE_GROWTH_REWARDS');
  const canManageAmbassadors = hasPermission('MANAGE_AMBASSADOR_PROGRAM');
  const canReviewAmbassadors = hasPermission('REVIEW_AMBASSADOR_APPLICATIONS');
  const [draft, setDraft] = useState<ReferralDraft>(emptyDraft);
  const [ambassadorDraft, setAmbassadorDraft] = useState<AmbassadorDraft>(emptyAmbassadorDraft);
  const [promotions, setPromotions] = useState<PromoCampaign[]>([]);
  const [referrals, setReferrals] = useState<GrowthReferral[]>([]);
  const [rewards, setRewards] = useState<GrowthReward[]>([]);
  const [ambassadorApplications, setAmbassadorApplications] = useState<AmbassadorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [config, ambassadorConfig, campaignRows, referralRows, rewardRows, ambassadorRows] = await Promise.all([
        growthApi.referralProgram(), growthApi.ambassadorProgram(), growthApi.promotions(), growthApi.referrals(), growthApi.rewards(), growthApi.ambassadorApplications(),
      ]);
      setDraft(draftFrom(config));
      setAmbassadorDraft(ambassadorDraftFrom(ambassadorConfig));
      setPromotions(campaignRows);
      setReferrals(referralRows);
      setRewards(rewardRows);
      setAmbassadorApplications(ambassadorRows);
    } catch {
      setError('Impossible de charger les programmes de parrainage et promotion.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => ({
    invited: referrals.length,
    qualified: referrals.filter((row) => row.status === 'QUALIFIED').length,
    pendingRewards: rewards.filter((row) => row.status === 'PENDING' || row.status === 'APPROVED').length,
    activePromotions: promotions.filter((row) => row.active).length,
    pendingAmbassadors: ambassadorApplications.filter((row) => row.status === 'PENDING').length,
  }), [referrals, rewards, promotions, ambassadorApplications]);

  async function saveProgram() {
    setSaving(true); setError(null); setNotice(null);
    try {
      const saved = await growthApi.updateReferralProgram({
        enabled: draft.enabled,
        minimumFiatAmount: draft.minimumFiatAmount ? Number(draft.minimumFiatAmount) : undefined,
        rewardType: draft.rewardType,
        rewardValue: Number(draft.rewardValue || 0),
        rewardCurrency: draft.rewardType === 'FIXED_FIAT' ? draft.rewardCurrency.trim().toUpperCase() : undefined,
        requiresKycApproval: draft.requiresKycApproval,
        firstCompletedTransaction: draft.firstCompletedTransaction,
      });
      setDraft(draftFrom(saved)); setNotice('Programme de parrainage enregistré.');
    } catch {
      setError('Impossible d’enregistrer le programme. Vérifiez les paramètres commerciaux et vos droits.');
    } finally { setSaving(false); }
  }

  async function switchCampaign(campaign: PromoCampaign, active: boolean) {
    setError(null); setNotice(null);
    try {
      await growthApi.updatePromotion(campaign.id, { active });
      await load();
      setNotice(`Code ${campaign.code} ${active ? 'activé' : 'désactivé'}.`);
    } catch { setError('Impossible de modifier cette campagne promo.'); }
  }

  async function approveReward(id: string) {
    try { await growthApi.approveReward(id); await load(); setNotice('Récompense approuvée pour règlement externe.'); }
    catch { setError('Impossible d’approuver cette récompense.'); }
  }

  async function settleReward(reward: GrowthReward) {
    const reference = window.prompt('Référence du règlement externe (Mobile Money, virement, etc.)');
    if (!reference?.trim()) return;
    const justification = window.prompt('Justification ou preuve de règlement') ?? '';
    if (!justification.trim()) return;
    try { await growthApi.settleReward(reward.id, { settlementReference: reference.trim(), justification: justification.trim() }); await load(); setNotice('Règlement externe enregistré avec sa référence.'); }
    catch { setError('Impossible d’enregistrer le règlement.'); }
  }

  async function saveAmbassadorProgram() {
    setSaving(true); setError(null); setNotice(null);
    try {
      const saved = await growthApi.updateAmbassadorProgram({
        enabled: ambassadorDraft.enabled,
        promoBenefitValue: Number(ambassadorDraft.promoBenefitValue || 0),
        promoMinimumFiatAmount: ambassadorDraft.promoMinimumFiatAmount ? Number(ambassadorDraft.promoMinimumFiatAmount) : undefined,
        promoMaximumRedemptions: ambassadorDraft.promoMaximumRedemptions ? Number(ambassadorDraft.promoMaximumRedemptions) : undefined,
        promoNewUsersOnly: ambassadorDraft.promoNewUsersOnly,
        promoFirstCompletedTransaction: ambassadorDraft.promoFirstCompletedTransaction,
        promoDurationDays: Number(ambassadorDraft.promoDurationDays || 30),
      });
      setAmbassadorDraft(ambassadorDraftFrom(saved));
      setNotice('Programme Ambassadeur enregistré. Les codes restent contrôlés par cette politique.');
    } catch { setError('Impossible d’enregistrer le programme Ambassadeur. Vérifiez vos droits et les limites.'); }
    finally { setSaving(false); }
  }

  async function approveAmbassador(application: AmbassadorApplication) {
    try {
      await growthApi.approveAmbassadorApplication(application.id);
      await load();
      setNotice(`${application.displayName} peut maintenant choisir son code promo.`);
    } catch { setError('Impossible d’approuver cette candidature Ambassadeur.'); }
  }

  async function rejectAmbassador(application: AmbassadorApplication) {
    const reason = window.prompt('Motif du refus ou informations à compléter');
    if (!reason?.trim()) return;
    try {
      await growthApi.rejectAmbassadorApplication(application.id, reason.trim());
      await load();
      setNotice('Candidature refusée avec un motif visible par le client.');
    } catch { setError('Impossible de refuser cette candidature Ambassadeur.'); }
  }

  return (
    <Screen>
      <PageHeader icon={Gift} title="Parrainage & Codes promo" subtitle="Configurez les avantages, contrôlez les attributions et conservez une preuve pour tout règlement externe." />
      {error && <div className="mb-4 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}
      {notice && <div className="mb-4 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">{notice}</div>}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={UsersRound} label="Invitations suivies" value={stats.invited} />
        <StatCard icon={CheckCircle2} iconTone="success" label="Parrainages qualifiés" value={stats.qualified} />
        <StatCard icon={HandCoins} iconTone="warning" label="Récompenses à régler" value={stats.pendingRewards} />
        <StatCard icon={TicketPercent} iconTone="purple" label="Codes promo actifs" value={stats.activePromotions} />
      </div>

      {stats.pendingAmbassadors > 0 && <div className="mb-4 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">{stats.pendingAmbassadors} candidature{stats.pendingAmbassadors > 1 ? 's' : ''} Ambassadeur à examiner.</div>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardTitle action={<Badge tone={draft.enabled ? 'success' : 'neutral'}>{draft.enabled ? 'Programme actif' : 'Programme désactivé'}</Badge>}>Programme de parrainage</CardTitle>
          <p className="mb-4 text-sm leading-5 text-onSurfaceVariant">Une récompense n’est créée qu’après les règles définies ici. Elle ne crée jamais un solde client dans JAL Trade.</p>
          <div className="space-y-3">
            <ToggleRow label="Activer le programme" description="Autorise la qualification de nouveaux parrainages." checked={draft.enabled} onChange={(enabled) => setDraft({ ...draft, enabled })} disabled={!canManage} />
            <ToggleRow label="KYC approuvé obligatoire" description="Le filleul doit avoir une identité validée." checked={draft.requiresKycApproval} onChange={(requiresKycApproval) => setDraft({ ...draft, requiresKycApproval })} disabled={!canManage} />
            <ToggleRow label="Première transaction terminée" description="Évite les récompenses répétées sur un même filleul." checked={draft.firstCompletedTransaction} onChange={(firstCompletedTransaction) => setDraft({ ...draft, firstCompletedTransaction })} disabled={!canManage} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Montant minimum (fiat, optionnel)" value={draft.minimumFiatAmount} type="number" disabled={!canManage} onChange={(minimumFiatAmount) => setDraft({ ...draft, minimumFiatAmount })} />
            <label className="block text-xs text-onSurfaceVariant">Type de récompense<select disabled={!canManage} value={draft.rewardType} onChange={(e) => setDraft({ ...draft, rewardType: e.target.value as ReferralDraft['rewardType'] })} className="mt-1 block min-h-11 w-full rounded-md border border-border bg-surface-higher px-3 text-sm text-onSurface outline-none disabled:opacity-60"><option value="PERCENT_OF_JAL_MARGIN">Pourcentage de la marge JAL</option><option value="FIXED_FIAT">Montant fixe en devise fiat</option></select></label>
            <Field label={draft.rewardType === 'FIXED_FIAT' ? 'Montant de la récompense' : 'Part de marge (%)'} value={draft.rewardValue} type="number" disabled={!canManage} onChange={(rewardValue) => setDraft({ ...draft, rewardValue })} />
            {draft.rewardType === 'FIXED_FIAT' && <Field label="Devise (ex. XAF)" value={draft.rewardCurrency} disabled={!canManage} onChange={(rewardCurrency) => setDraft({ ...draft, rewardCurrency })} />}
          </div>
          {canManage && <Button variant="primary" className="mt-5 w-full justify-center" onClick={saveProgram} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le programme'}</Button>}
        </Card>

        <Card>
          <CardTitle>Protection et traçabilité</CardTitle>
          <div className="space-y-3 text-sm">
            <InfoRow icon={ShieldCheck} title="Un seul parrain par client" detail="L’attribution est enregistrée à l’inscription et verrouillée par la base de données." />
            <InfoRow icon={TicketPercent} title="Code promo vérifié côté serveur" detail="Pays, actif, période, montant minimal, plafond d’utilisations et première transaction sont contrôlés avant le devis." />
            <InfoRow icon={HandCoins} title="Aucun solde custodial" detail="Le back-office ne fait qu’approuver et archiver la référence d’un règlement externe validé." />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <Card>
          <CardTitle action={<Badge tone={ambassadorDraft.enabled ? 'success' : 'neutral'}>{ambassadorDraft.enabled ? 'Programme actif' : 'Programme désactivé'}</Badge>}>Programme Ambassadeur</CardTitle>
          <p className="mb-4 text-sm leading-5 text-onSurfaceVariant">Les ambassadeurs peuvent soumettre leurs communautés. Une fois approuvés, ils choisissent seulement le texte du code ; cette politique fixe la remise et les protections commerciales.</p>
          <div className="space-y-3">
            <ToggleRow label="Accepter les candidatures" description="Autorise le formulaire client Ambassadeur." checked={ambassadorDraft.enabled} onChange={(enabled) => setAmbassadorDraft({ ...ambassadorDraft, enabled })} disabled={!canManageAmbassadors} />
            <ToggleRow label="Nouveaux utilisateurs uniquement" description="Le code Ambassadeur n’est valable que pour le premier parcours du client." checked={ambassadorDraft.promoNewUsersOnly} onChange={(promoNewUsersOnly) => setAmbassadorDraft({ ...ambassadorDraft, promoNewUsersOnly })} disabled={!canManageAmbassadors} />
            <ToggleRow label="Première transaction terminée" description="Évite que la même remise soit employée après un premier échange terminé." checked={ambassadorDraft.promoFirstCompletedTransaction} onChange={(promoFirstCompletedTransaction) => setAmbassadorDraft({ ...ambassadorDraft, promoFirstCompletedTransaction })} disabled={!canManageAmbassadors} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Remise de marge (%)" value={ambassadorDraft.promoBenefitValue} type="number" disabled={!canManageAmbassadors} onChange={(promoBenefitValue) => setAmbassadorDraft({ ...ambassadorDraft, promoBenefitValue })} />
            <Field label="Validité du code (jours)" value={ambassadorDraft.promoDurationDays} type="number" disabled={!canManageAmbassadors} onChange={(promoDurationDays) => setAmbassadorDraft({ ...ambassadorDraft, promoDurationDays })} />
            <Field label="Montant minimum (fiat, optionnel)" value={ambassadorDraft.promoMinimumFiatAmount} type="number" disabled={!canManageAmbassadors} onChange={(promoMinimumFiatAmount) => setAmbassadorDraft({ ...ambassadorDraft, promoMinimumFiatAmount })} />
            <Field label="Utilisations maximum (optionnel)" value={ambassadorDraft.promoMaximumRedemptions} type="number" disabled={!canManageAmbassadors} onChange={(promoMaximumRedemptions) => setAmbassadorDraft({ ...ambassadorDraft, promoMaximumRedemptions })} />
          </div>
          {canManageAmbassadors && <Button variant="primary" className="mt-5 w-full justify-center" onClick={saveAmbassadorProgram} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer le programme Ambassadeur'}</Button>}
        </Card>

        <Card padded={false}>
          <div className="p-4 pb-2 sm:p-5 sm:pb-3"><CardTitle action={<Badge tone="info">Revue manuelle</Badge>}>Candidatures Ambassadeur</CardTitle><p className="-mt-3 text-xs leading-5 text-onSurfaceVariant">Les liens, métriques et la décision sont conservés pour l’équipe autorisée. L’approbation débloque le choix du code, pas ses conditions commerciales.</p></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-xs text-onSurfaceVariant"><th className="px-4 py-3 font-medium">Candidat</th><th className="px-4 py-3 font-medium">Communauté</th><th className="px-4 py-3 font-medium">Code</th><th className="px-4 py-3 font-medium">Statut</th><th className="px-4 py-3 font-medium"></th></tr></thead><tbody>{ambassadorApplications.slice(0, 12).map((row) => <tr key={row.id} className="border-b border-border/60 align-top"><td className="px-4 py-3"><div className="font-medium">{row.displayName}</div><div className="mt-1 text-xs text-onSurfaceVariant">{identity(row.user)} · {row.user.country}</div><div className="mt-1 text-xs text-onSurfaceVariant">KYC : {row.user.kycStatus}</div></td><td className="px-4 py-3 text-xs text-onSurfaceVariant"><div>{row.audienceSize?.toLocaleString() ?? '—'} abonnés · {row.monthlyReach?.toLocaleString() ?? '—'} portée</div><div className="mt-1 max-w-[210px] break-all">{[row.whatsappUrl, row.telegramUrl, ...row.otherCommunityLinks].filter(Boolean).join(' · ') || 'Aucun lien'}</div></td><td className="whitespace-nowrap px-4 py-3 font-mono text-primary">{row.promoCampaign?.code ?? 'Après approbation'}<div className="mt-1 font-sans text-xs text-onSurfaceVariant">{row.promoCampaign ? `${row.promoCampaign.redemptionsReserved} utilisation(s)` : ''}</div></td><td className="px-4 py-3"><Badge tone={row.status === 'APPROVED' ? 'success' : row.status === 'PENDING' ? 'warning' : 'error'}>{labelAmbassador(row.status)}</Badge>{row.rejectionReason && <div className="mt-1 max-w-[180px] text-xs text-error">{row.rejectionReason}</div>}</td><td className="whitespace-nowrap px-4 py-3 text-right">{row.status === 'PENDING' && canReviewAmbassadors && <div className="flex justify-end gap-2"><Button className="min-h-8 px-2 py-1 text-xs" onClick={() => approveAmbassador(row)}>Approuver</Button><Button variant="danger" className="min-h-8 px-2 py-1 text-xs" onClick={() => rejectAmbassador(row)}>Refuser</Button></div>}</td></tr>)}{!loading && ambassadorApplications.length === 0 && <tr><td colSpan={5} className="px-4 py-7 text-center text-onSurfaceVariant"><UserRoundCheck size={18} className="mr-2 inline" />Aucune candidature Ambassadeur.</td></tr>}</tbody></table></div>
        </Card>
      </div>

      <Card padded={false} className="mt-4">
        <div className="p-4 pb-2 sm:p-5 sm:pb-3"><CardTitle>Campagnes de codes promo</CardTitle><p className="-mt-3 text-xs text-onSurfaceVariant">La remise réduit la marge JAL avant que le taux client soit verrouillé.</p></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-xs text-onSurfaceVariant">{['Code', 'Avantage', 'Périmètre', 'Utilisations', 'Période', 'Statut'].map((h) => <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{promotions.map((row) => <tr key={row.id} className="border-b border-border/60"><td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-primary">{row.code}<div className="mt-1 font-sans text-xs font-normal text-onSurfaceVariant">{row.name}</div></td><td className="whitespace-nowrap px-4 py-3">−{row.benefitValue}% de marge JAL</td><td className="px-4 py-3 text-xs text-onSurfaceVariant">{row.countries.length ? row.countries.join(', ') : 'Tous pays'}<br />{row.cryptos.join(', ')}</td><td className="whitespace-nowrap px-4 py-3">{row.redemptionsReserved}{row.maximumRedemptions ? ` / ${row.maximumRedemptions}` : ''}</td><td className="whitespace-nowrap px-4 py-3 text-xs text-onSurfaceVariant">{formatDateTime(row.startsAt)}<br />au {formatDateTime(row.endsAt)}</td><td className="whitespace-nowrap px-4 py-3">{canManage ? <Toggle checked={row.active} onChange={(active) => switchCampaign(row, active)} /> : <Badge tone={row.active ? 'success' : 'neutral'}>{row.active ? 'Actif' : 'Désactivé'}</Badge>}</td></tr>)}{!loading && promotions.length === 0 && <tr><td colSpan={6} className="px-4 py-7 text-center text-onSurfaceVariant">Aucune campagne promo configurée.</td></tr>}</tbody></table></div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card padded={false}><div className="p-4 pb-2 sm:p-5 sm:pb-3"><CardTitle>Derniers parrainages</CardTitle></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-xs text-onSurfaceVariant"><th className="px-4 py-3 font-medium">Parrain</th><th className="px-4 py-3 font-medium">Filleul</th><th className="px-4 py-3 font-medium">Statut</th></tr></thead><tbody>{referrals.slice(0, 6).map((row) => <tr key={row.id} className="border-b border-border/60"><td className="px-4 py-3 text-xs">{identity(row.referrer)}</td><td className="px-4 py-3 text-xs">{identity(row.referredUser)}</td><td className="px-4 py-3"><Badge tone={row.status === 'QUALIFIED' ? 'success' : row.status === 'PENDING' ? 'warning' : 'error'}>{labelReferral(row.status)}</Badge></td></tr>)}</tbody></table></div></Card>
        <Card padded={false}><div className="p-4 pb-2 sm:p-5 sm:pb-3"><CardTitle>Récompenses de parrainage</CardTitle></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-xs text-onSurfaceVariant"><th className="px-4 py-3 font-medium">Montant</th><th className="px-4 py-3 font-medium">Statut</th><th className="px-4 py-3 font-medium"></th></tr></thead><tbody>{rewards.slice(0, 6).map((row) => <tr key={row.id} className="border-b border-border/60"><td className="px-4 py-3 font-semibold">{formatAmount(row.calculatedAmount, row.currency)}<div className="mt-1 text-xs font-normal text-onSurfaceVariant">{identity(row.referral.referrer)}</div></td><td className="px-4 py-3"><Badge tone={toneReward(row.status)}>{labelReward(row.status)}</Badge></td><td className="px-4 py-3 text-right">{row.status === 'PENDING' && canManage && <Button className="min-h-8 px-2 py-1 text-xs" onClick={() => approveReward(row.id)}>Approuver</Button>}{row.status === 'APPROVED' && canSettle && <Button variant="primary" className="min-h-8 px-2 py-1 text-xs" onClick={() => settleReward(row)}>Régler</Button>}{row.status === 'SETTLED' && <span className="text-xs text-success">Réf. enregistrée</span>}</td></tr>)}</tbody></table></div></Card>
      </div>
    </Screen>
  );
}

function Field({ label, value, onChange, type = 'text', disabled }: { label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean }) {
  return <label className="block text-xs text-onSurfaceVariant">{label}<input disabled={disabled} value={value} type={type} min={type === 'number' ? 0 : undefined} onChange={(e) => onChange(e.target.value)} className="mt-1 block min-h-11 w-full rounded-md border border-border bg-surface-higher px-3 text-sm text-onSurface outline-none disabled:opacity-60" /></label>;
}

function ToggleRow({ label, description, checked, onChange, disabled }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void; disabled: boolean }) {
  return <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface-higher/50 p-3"><div><div className="text-sm font-medium text-onSurface">{label}</div><div className="mt-0.5 text-xs text-onSurfaceVariant">{description}</div></div><div className={disabled ? 'pointer-events-none opacity-60' : ''}><Toggle checked={checked} onChange={onChange} /></div></div>;
}

function InfoRow({ icon: Icon, title, detail }: { icon: typeof ShieldCheck; title: string; detail: string }) {
  return <div className="flex gap-3 rounded-md border border-border bg-surface-higher/40 p-3"><Icon size={18} className="mt-0.5 shrink-0 text-primary" /><div><div className="font-medium text-onSurface">{title}</div><div className="mt-1 text-xs leading-5 text-onSurfaceVariant">{detail}</div></div></div>;
}

function identity(user: { email: string | null; phone: string | null }) { return user.email ?? user.phone ?? 'Client'; }
function labelReferral(status: GrowthReferral['status']) { return status === 'QUALIFIED' ? 'Qualifié' : status === 'PENDING' ? 'En attente' : 'Écarté'; }
function labelReward(status: GrowthReward['status']) { return { PENDING: 'À approuver', APPROVED: 'À régler', SETTLED: 'Réglée', CANCELLED: 'Annulée' }[status]; }
function toneReward(status: GrowthReward['status']) { return status === 'SETTLED' ? 'success' : status === 'CANCELLED' ? 'error' : status === 'APPROVED' ? 'warning' : 'info'; }
function labelAmbassador(status: AmbassadorApplication['status']) { return status === 'APPROVED' ? 'Approuvée' : status === 'PENDING' ? 'À examiner' : 'Refusée'; }
