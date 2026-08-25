import { NormalizedStatus } from '../provider-adapters/provider-adapter.interface';

/**
 * Arch §3 — "Failover ≠ Retry aveugle". The exact three-branch decision,
 * encoded once as a pure function so it's unit-testable in isolation and
 * every caller (transaction-engine) goes through the same logic rather than
 * re-deriving it ad hoc.
 */
export type FailoverBranch = 'confirmed-success' | 'confirmed-failure' | 'unknown' | 'pending';

export function classifyProviderOutcome(outcome: { threw: boolean; status?: NormalizedStatus }): FailoverBranch {
  // A network error / timeout is exactly Arch §3's "aucune réponse claire" —
  // the operation may have succeeded server-side without JAL knowing.
  if (outcome.threw) return 'unknown';

  switch (outcome.status) {
    case 'JAL_SUCCESS':
      return 'confirmed-success';
    case 'JAL_FAILED':
      return 'confirmed-failure';
    case 'JAL_PENDING':
      return 'pending';
    case 'JAL_UNKNOWN':
    default:
      return 'unknown';
  }
}

/**
 * What the caller is allowed to do for each branch — documented here so the
 * rule lives in one place instead of being re-decided at each call site:
 *
 * - confirmed-success -> advance the state machine, never retry.
 * - confirmed-failure -> the Routing Engine may select a new provider and a
 *   NEW attempt-numbered idempotency key (a real failover, not a retry).
 * - unknown           -> verify via getTransactionStatus()/webhook before
 *   any further action. No new order under the OLD or a NEW key.
 * - pending           -> keep polling under the SAME key; not a failure.
 */
