import { TxStatus, TxType } from '@prisma/client';

/**
 * UX §16 — exact copy, verbatim. The frontend's mock data already renders
 * these strings; this is the server-side source of truth they get replaced
 * by. Only the 8 explicitly-specified achat/vente entries are spec-verbatim;
 * anything else is a reasonable placeholder pending a real product-copy
 * decision, flagged inline.
 */
export interface NotificationCopy {
  title: string;
  body: (jalTransactionId: string) => string;
}

const ACHAT: Partial<Record<TxStatus, NotificationCopy>> = {
  paiementRecu: { title: 'Paiement reçu', body: () => 'Votre paiement a été reçu.' },
  cryptoEnCoursEnvoi: { title: "Crypto en cours d'envoi", body: () => "Votre crypto est en cours d'envoi." },
  cryptoEnvoyee: { title: 'Crypto envoyée', body: () => 'Votre crypto a été envoyée.' },
  terminee: { title: 'Transaction terminée', body: (id) => `Votre transaction ${id} est terminée.` },
};

const VENTE: Partial<Record<TxStatus, NotificationCopy>> = {
  cryptoDetectee: { title: 'Crypto détectée', body: () => 'Nous avons détecté votre crypto.' },
  confirmationsBlockchainSuffisantes: { title: 'Blockchain confirmée', body: () => 'La blockchain a confirmé votre transaction.' },
  paiementMobileMoneyEnCours: { title: 'Paiement Mobile Money en cours', body: () => 'Votre paiement Mobile Money est en cours.' },
  paiementEffectue: { title: 'Paiement Mobile Money effectué', body: () => 'Votre paiement Mobile Money a été effectué.' },
};

// Not spec-verbatim — reasonable placeholders, flag for product copy review.
const COMMON_PLACEHOLDER: Partial<Record<TxStatus, NotificationCopy>> = {
  interventionRequise: {
    title: 'Vérification en cours',
    body: (id) => `Votre transaction ${id} prend un peu plus de temps que prévu — nous la suivons pour vous.`,
  },
  remboursementEnCours: { title: 'Remboursement en cours', body: (id) => `Le remboursement de votre transaction ${id} est en cours.` },
  rembourse: { title: 'Remboursement effectué', body: (id) => `Votre transaction ${id} a été remboursée.` },
  echec: { title: 'Transaction échouée', body: (id) => `Votre transaction ${id} n'a pas pu être finalisée.` },
};

export function copyFor(type: TxType, status: TxStatus): NotificationCopy | undefined {
  return (type === 'achat' ? ACHAT[status] : VENTE[status]) ?? COMMON_PLACEHOLDER[status];
}
