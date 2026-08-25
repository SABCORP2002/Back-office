import { TxStatus, TxType } from '@prisma/client';

/**
 * TDS §4.1/§4.2 encoded as data. Three layers, all merged into one adjacency
 * map by `buildAllowedEdges()`:
 *
 * 1. FLOW — the linear happy path per type.
 * 2. DIRECT_FAILURE_EDGES — the specific early-exit failure transitions the
 *    tables call out explicitly (e.g. an initiation failure goes straight to
 *    `echec` without ever entering `paiementEnAttente`; a payment that's
 *    simply never made times out to `echec`/`expiree`, not
 *    `interventionRequise` — no ops action is needed for a payment nobody made).
 * 3. Universal transverse rules — "Tout état non terminal" → interventionRequise
 *    (TDS §4.1/§4.2's transverse row), interventionRequise → remboursementEnCours
 *    → rembourse, and interventionRequise → resume (any flow status of the
 *    same type) — the last one only ever invoked via the admin-override path
 *    in transaction-engine, which is the one place a justification + audit
 *    log entry is mandatory (Arch §5.1).
 */

export const BUY_FLOW: TxStatus[] = [
  'commandeCreee',
  'paiementEnAttente',
  'paiementRecu',
  'cryptoEnCoursEnvoi',
  'cryptoEnvoyee',
  'terminee',
];

export const SELL_FLOW: TxStatus[] = [
  'commandeCreee',
  'enAttenteDeCrypto',
  'cryptoDetectee',
  'confirmationsBlockchainSuffisantes',
  'paiementMobileMoneyEnCours',
  'paiementEffectue',
  'terminee',
];

export const TERMINAL_STATUSES: ReadonlySet<TxStatus> = new Set([
  'terminee',
  'echec',
  'expiree',
  'annulee',
  'rembourse',
]);

export function isTerminal(status: TxStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

const DIRECT_FAILURE_EDGES: Record<TxType, Array<[TxStatus, TxStatus]>> = {
  achat: [
    // Échec d'initiation du paiement → ÉCHEC directement, aucun paiement engagé.
    ['commandeCreee', 'echec'],
    ['commandeCreee', 'annulee'],
    // Paiement jamais reçu dans le délai → ÉCHEC/EXPIRÉE, pas d'intervention.
    ['paiementEnAttente', 'echec'],
    ['paiementEnAttente', 'expiree'],
  ],
  vente: [
    ['commandeCreee', 'annulee'],
    // Crypto jamais détectée dans la fenêtre → ÉCHEC/EXPIRÉE (FLOW 09).
    ['enAttenteDeCrypto', 'echec'],
    ['enAttenteDeCrypto', 'expiree'],
  ],
};

function flowFor(type: TxType): TxStatus[] {
  return type === 'achat' ? BUY_FLOW : SELL_FLOW;
}

function edgeKey(from: TxStatus, to: TxStatus): string {
  return `${from}->${to}`;
}

/** Builds the full allowed-edge set for one TxType, per the three layers above. */
export function buildAllowedEdges(type: TxType): ReadonlySet<string> {
  const flow = flowFor(type);
  const edges = new Set<string>();

  for (let i = 0; i < flow.length - 1; i++) {
    edges.add(edgeKey(flow[i], flow[i + 1]));
  }
  for (const [from, to] of DIRECT_FAILURE_EDGES[type]) {
    edges.add(edgeKey(from, to));
  }
  for (const status of flow) {
    if (!isTerminal(status) && status !== 'interventionRequise') {
      edges.add(edgeKey(status, 'interventionRequise'));
    }
  }
  edges.add(edgeKey('interventionRequise', 'remboursementEnCours'));
  edges.add(edgeKey('remboursementEnCours', 'rembourse'));
  edges.add(edgeKey('remboursementEnCours', 'echec')); // remboursement lui-même échoué (TDS §7 DLQ)
  // Resume: interventionRequise -> any non-terminal flow status (admin-only, audited).
  for (const status of flow) {
    if (!isTerminal(status)) {
      edges.add(edgeKey('interventionRequise', status));
    }
  }

  return edges;
}

const EDGE_CACHE = new Map<TxType, ReadonlySet<string>>();

export function isAllowedTransition(type: TxType, from: TxStatus, to: TxStatus): boolean {
  if (!EDGE_CACHE.has(type)) EDGE_CACHE.set(type, buildAllowedEdges(type));
  return EDGE_CACHE.get(type)!.has(edgeKey(from, to));
}
