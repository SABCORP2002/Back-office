import type { BadgeTone } from '../components/Badge';
import type { TxStatus } from './api';

/** Mirrors frontend/lib/data/models.dart TxStatusX.label exactly — same vocabulary on both the client app and this back office. */
export const TX_STATUS_LABELS: Record<TxStatus, string> = {
  commandeCreee: 'Commande créée',
  paiementEnAttente: 'Paiement en attente',
  paiementRecu: 'Paiement reçu',
  cryptoEnCoursEnvoi: "Crypto en cours d'envoi",
  cryptoEnvoyee: 'Crypto envoyée',
  enAttenteDeCrypto: 'En attente de crypto',
  cryptoDetectee: 'Crypto détectée',
  confirmationsBlockchainSuffisantes: 'Blockchain confirmée',
  paiementMobileMoneyEnCours: 'Paiement Mobile Money',
  paiementEffectue: 'Paiement effectué',
  terminee: 'Terminée',
  echec: 'Échec',
  expiree: 'Expirée',
  annulee: 'Annulée',
  interventionRequise: 'Intervention requise',
  remboursementEnCours: 'Remboursement en cours',
  rembourse: 'Remboursé',
};

export const TX_STATUS_TONE: Record<TxStatus, BadgeTone> = {
  commandeCreee: 'neutral',
  paiementEnAttente: 'warning',
  paiementRecu: 'info',
  cryptoEnCoursEnvoi: 'info',
  cryptoEnvoyee: 'info',
  enAttenteDeCrypto: 'warning',
  cryptoDetectee: 'info',
  confirmationsBlockchainSuffisantes: 'info',
  paiementMobileMoneyEnCours: 'info',
  paiementEffectue: 'info',
  terminee: 'success',
  echec: 'error',
  expiree: 'error',
  annulee: 'error',
  interventionRequise: 'purple',
  remboursementEnCours: 'warning',
  rembourse: 'success',
};
