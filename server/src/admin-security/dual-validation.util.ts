import { ForbiddenException } from '@nestjs/common';

/**
 * Arch §10: "Deux comptes distincts (jamais le même) doivent chacun
 * approuver l'action avant exécution." Called by refund (and any future
 * above-threshold action) once the amount crosses the configurable
 * threshold (TDS §19 — "Seuil de double validation — remboursement, à
 * définir par la Finance").
 */
export function assertDistinctCoValidator(authorizedBy: string, coValidatedBy: string | undefined | null): void {
  if (!coValidatedBy) {
    throw new ForbiddenException('This action requires a second, distinct admin to co-validate before it executes.');
  }
  if (coValidatedBy === authorizedBy) {
    throw new ForbiddenException('Co-validation must come from a different admin account than the one authorizing the action.');
  }
}
