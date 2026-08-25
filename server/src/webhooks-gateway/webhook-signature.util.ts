import { createHmac, timingSafeEqual } from 'crypto';

/**
 * TDS §8 "Validation signature — Signature/HMAC vérifiée contre le secret
 * propre à chaque source avant tout traitement." Verifies over
 * `JSON.stringify(payload)` rather than the true raw request bytes — a
 * known simplification (see webhooks.controller.ts) since no raw-body
 * middleware is wired in this pass; a real provider integration must swap
 * this for signing over the exact bytes received.
 */
export function verifyHmacSignature(payload: unknown, signatureHeader: string | undefined, secret: string): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signatureHeader, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
