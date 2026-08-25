import { randomInt } from 'crypto';

/**
 * JAL Transaction ID generator — the format the frontend already renders
 * everywhere (frontend/lib/data/flow_state.dart's `generateJalTransactionId`,
 * kept in sync deliberately). Generated server-side only, at commande créée
 * (Arch §6): "Le JAL Transaction ID est généré côté JAL (jamais par un
 * fournisseur)".
 */
const CHARS = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function block(): string {
  let out = '';
  for (let i = 0; i < 4; i++) out += CHARS[randomInt(CHARS.length)];
  return out;
}

export function generateJalTransactionId(): string {
  return `JAL-${block()}-${block()}`;
}
