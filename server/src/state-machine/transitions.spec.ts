import { TxStatus } from '@prisma/client';
import { isAllowedTransition } from './transitions';

describe('state machine transitions (TDS §4)', () => {
  describe('achat (BUY)', () => {
    it('allows the full happy path in order', () => {
      const path: Array<[TxStatus, TxStatus]> = [
        ['commandeCreee', 'paiementEnAttente'],
        ['paiementEnAttente', 'paiementRecu'],
        ['paiementRecu', 'cryptoEnCoursEnvoi'],
        ['cryptoEnCoursEnvoi', 'cryptoEnvoyee'],
        ['cryptoEnvoyee', 'terminee'],
      ];
      for (const [from, to] of path) {
        expect(isAllowedTransition('achat', from, to)).toBe(true);
      }
    });

    it('rejects skipping a step', () => {
      expect(isAllowedTransition('achat', 'commandeCreee', 'cryptoEnCoursEnvoi')).toBe(false);
      expect(isAllowedTransition('achat', 'paiementRecu', 'terminee')).toBe(false);
    });

    it('rejects going backwards', () => {
      expect(isAllowedTransition('achat', 'paiementRecu', 'commandeCreee')).toBe(false);
      expect(isAllowedTransition('achat', 'cryptoEnvoyee', 'paiementRecu')).toBe(false);
    });

    it('allows the direct initiation-failure edge without ever touching paiementEnAttente', () => {
      expect(isAllowedTransition('achat', 'commandeCreee', 'echec')).toBe(true);
    });

    it('allows a never-paid timeout to go straight to echec/expiree, not intervention', () => {
      expect(isAllowedTransition('achat', 'paiementEnAttente', 'echec')).toBe(true);
      expect(isAllowedTransition('achat', 'paiementEnAttente', 'expiree')).toBe(true);
    });

    it('allows any non-terminal state to escalate to interventionRequise', () => {
      expect(isAllowedTransition('achat', 'cryptoEnCoursEnvoi', 'interventionRequise')).toBe(true);
      expect(isAllowedTransition('achat', 'cryptoEnvoyee', 'interventionRequise')).toBe(true);
    });

    it('never allows a terminal state to transition anywhere', () => {
      expect(isAllowedTransition('achat', 'terminee', 'interventionRequise')).toBe(false);
      expect(isAllowedTransition('achat', 'echec', 'commandeCreee')).toBe(false);
    });

    it('routes intervention through remboursement, never straight to rembourse', () => {
      expect(isAllowedTransition('achat', 'interventionRequise', 'rembourse')).toBe(false);
      expect(isAllowedTransition('achat', 'interventionRequise', 'remboursementEnCours')).toBe(true);
      expect(isAllowedTransition('achat', 'remboursementEnCours', 'rembourse')).toBe(true);
    });

    it('allows admin resume from intervention back into the flow', () => {
      expect(isAllowedTransition('achat', 'interventionRequise', 'cryptoEnCoursEnvoi')).toBe(true);
    });
  });

  describe('vente (SELL)', () => {
    it('allows the full happy path in order', () => {
      const path: Array<[TxStatus, TxStatus]> = [
        ['commandeCreee', 'enAttenteDeCrypto'],
        ['enAttenteDeCrypto', 'cryptoDetectee'],
        ['cryptoDetectee', 'confirmationsBlockchainSuffisantes'],
        ['confirmationsBlockchainSuffisantes', 'paiementMobileMoneyEnCours'],
        ['paiementMobileMoneyEnCours', 'paiementEffectue'],
        ['paiementEffectue', 'terminee'],
      ];
      for (const [from, to] of path) {
        expect(isAllowedTransition('vente', from, to)).toBe(true);
      }
    });

    it('rejects a BUY-only edge on a SELL transaction', () => {
      expect(isAllowedTransition('vente', 'commandeCreee', 'paiementEnAttente')).toBe(false);
    });

    it('allows crypto-never-detected timeout straight to echec/expiree', () => {
      expect(isAllowedTransition('vente', 'enAttenteDeCrypto', 'echec')).toBe(true);
      expect(isAllowedTransition('vente', 'enAttenteDeCrypto', 'expiree')).toBe(true);
    });
  });
});
