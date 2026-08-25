import { Transaction } from '@prisma/client';

/**
 * UX §15's field-visibility table, enforced in code rather than left to
 * "the frontend just won't render it": provider name, provider cost, and
 * JAL margin never leave the server for a client-facing response.
 */
export function toClientTransactionView(tx: Transaction & { blockchainTransactions?: { txHash: string | null }[] }) {
  return {
    jalTransactionId: tx.jalTransactionId,
    type: tx.type,
    status: tx.status,
    crypto: tx.crypto,
    network: tx.network,
    cryptoAmount: tx.cryptoAmountExpected,
    fiatAmount: tx.fiatAmountExpected,
    fiatCurrency: tx.fiatCurrency,
    jalRate: tx.jalRateLocked,
    feesLabel: '0', // TDS mock data shows "0 XAF" everywhere in V1 — no separate visible-fee line item yet
    momoOperator: tx.momoOperator,
    momoNumber: tx.momoNumber,
    walletAddress: tx.destinationWalletAddress ?? tx.depositAddressGenerated,
    txHash: tx.blockchainTransactions?.[0]?.txHash ?? null,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
  };
}
