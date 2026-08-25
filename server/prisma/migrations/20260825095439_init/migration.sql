-- CreateEnum
CREATE TYPE "TxType" AS ENUM ('achat', 'vente');

-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('commandeCreee', 'paiementEnAttente', 'paiementRecu', 'cryptoEnCoursEnvoi', 'cryptoEnvoyee', 'enAttenteDeCrypto', 'cryptoDetectee', 'confirmationsBlockchainSuffisantes', 'paiementMobileMoneyEnCours', 'paiementEffectue', 'terminee', 'echec', 'expiree', 'annulee', 'interventionRequise', 'remboursementEnCours', 'rembourse');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "KycTier" AS ENUM ('NONE', 'BASIC', 'STANDARD', 'ADVANCED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TriggeredBy" AS ENUM ('system', 'webhook', 'admin', 'job');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'LOCKED');

-- CreateEnum
CREATE TYPE "PaymentDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ProviderOrderDirection" AS ENUM ('BUY_SEND', 'SELL_RECEIVE');

-- CreateEnum
CREATE TYPE "NormalizedProviderStatus" AS ENUM ('JAL_PENDING', 'JAL_SUCCESS', 'JAL_FAILED', 'JAL_UNKNOWN');

-- CreateEnum
CREATE TYPE "BlockchainDirection" AS ENUM ('OUTGOING', 'INCOMING');

-- CreateEnum
CREATE TYPE "BlockchainTxStatus" AS ENUM ('PENDING', 'DETECTED', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'IGNORED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReconciliationResult" AS ENUM ('RECONCILED', 'ANOMALY');

-- CreateEnum
CREATE TYPE "ProviderHealthStatus" AS ENUM ('UP', 'DEGRADED', 'DOWN');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPPORT', 'OPERATIONS', 'FINANCE', 'ADMIN_SYSTEM');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "KycRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "CountryStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'DISABLED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "pinHash" TEXT,
    "country" TEXT NOT NULL,
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "kycTier" "KycTier" NOT NULL DEFAULT 'NONE',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "otpCodeHash" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "termsAcceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_submissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "countryOfResidence" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "frontDocRef" TEXT,
    "backDocRef" TEXT,
    "selfieRef" TEXT,
    "status" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "riskLevel" "KycRiskLevel" NOT NULL DEFAULT 'LOW',
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "jalTransactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TxType" NOT NULL,
    "status" "TxStatus" NOT NULL DEFAULT 'commandeCreee',
    "crypto" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "fiatCurrency" TEXT NOT NULL,
    "fiatAmountExpected" DECIMAL(24,8) NOT NULL,
    "cryptoAmountExpected" DECIMAL(36,18) NOT NULL,
    "jalRateLocked" DECIMAL(24,8) NOT NULL,
    "jalMargin" DECIMAL(24,8) NOT NULL,
    "destinationWalletAddress" TEXT,
    "depositAddressGenerated" TEXT,
    "momoOperator" TEXT,
    "momoNumber" TEXT,
    "providerId" TEXT,
    "quoteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "terminalAt" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("jalTransactionId")
);

-- CreateTable
CREATE TABLE "transaction_events" (
    "id" TEXT NOT NULL,
    "jalTransactionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "previousStatus" "TxStatus",
    "newStatus" "TxStatus" NOT NULL,
    "triggeredBy" "TriggeredBy" NOT NULL,
    "sourceReference" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "crypto" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "fiatCurrency" TEXT NOT NULL,
    "providerRate" DECIMAL(24,8) NOT NULL,
    "jalMargin" DECIMAL(24,8) NOT NULL,
    "jalRateClient" DECIMAL(24,8) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'ACTIVE',
    "lockedAt" TIMESTAMP(3),

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_attempts" (
    "id" TEXT NOT NULL,
    "jalTransactionId" TEXT NOT NULL,
    "direction" "PaymentDirection" NOT NULL,
    "operator" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "amount" DECIMAL(24,8) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "providerReference" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_orders" (
    "id" TEXT NOT NULL,
    "jalTransactionId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "direction" "ProviderOrderDirection" NOT NULL,
    "requestedAmount" DECIMAL(36,18) NOT NULL,
    "providerOrderId" TEXT,
    "status" "NormalizedProviderStatus" NOT NULL DEFAULT 'JAL_PENDING',
    "rawProviderStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockchain_transactions" (
    "id" TEXT NOT NULL,
    "jalTransactionId" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "direction" "BlockchainDirection" NOT NULL,
    "amountExpected" DECIMAL(36,18) NOT NULL,
    "txHash" TEXT,
    "amountDetected" DECIMAL(36,18),
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "status" "BlockchainTxStatus" NOT NULL DEFAULT 'PENDING',
    "detectedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "blockchain_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "jalTransactionId" TEXT NOT NULL,
    "amount" DECIMAL(24,8) NOT NULL,
    "destination" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "authorizedBy" TEXT NOT NULL,
    "coValidatedBy" TEXT,
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "jalTransactionId" TEXT,
    "resultSnapshot" JSONB,
    "status" "IdempotencyStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "signatureValid" BOOLEAN NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventTimestamp" TIMESTAMP(3),
    "jalTransactionId" TEXT,
    "processedAt" TIMESTAMP(3),
    "processingStatus" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_records" (
    "id" TEXT NOT NULL,
    "jalTransactionId" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jalStatus" "TxStatus" NOT NULL,
    "mobileMoneyStatus" TEXT,
    "providerStatus" TEXT,
    "blockchainStatus" TEXT,
    "expectedAmounts" JSONB NOT NULL,
    "actualAmounts" JSONB NOT NULL,
    "result" "ReconciliationResult" NOT NULL,
    "anomalyType" TEXT,

    CONSTRAINT "reconciliation_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_actions" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "jalTransactionId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "justification" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "requiresDualValidation" BOOLEAN NOT NULL DEFAULT false,
    "coValidatedBy" TEXT,

    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_health" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" "ProviderHealthStatus" NOT NULL DEFAULT 'UP',
    "successRateWindow" DOUBLE PRECISION,
    "avgLatencyMs" INTEGER,
    "lastCheckAt" TIMESTAMP(3),
    "disabledManually" BOOLEAN NOT NULL DEFAULT false,
    "disabledBy" TEXT,

    CONSTRAINT "provider_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supportedCountries" TEXT[],
    "supportedCryptos" TEXT[],
    "supportedNetworks" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "webhookSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routing_rules" (
    "id" TEXT NOT NULL,
    "country" TEXT,
    "crypto" TEXT,
    "network" TEXT,
    "forcedProviderId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_configs" (
    "id" TEXT NOT NULL,
    "country" TEXT,
    "crypto" TEXT,
    "direction" "TxType",
    "marginPct" DECIMAL(6,4) NOT NULL,
    "marginMinPct" DECIMAL(6,4),
    "marginMaxPct" DECIMAL(6,4),
    "feeFixed" DECIMAL(24,8) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "timezone" TEXT,
    "kycRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" "CountryStatus" NOT NULL DEFAULT 'ACTIVE',
    "minAmount" DECIMAL(24,8),
    "maxAmount" DECIMAL(24,8),
    "dailyMax" DECIMAL(24,8),
    "description" TEXT,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_payment_methods" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "feePct" DECIMAL(6,4),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "country_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "crypto" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_mobile_money_methods" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operatorName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_mobile_money_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "jalTransactionId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "jalTransactionId" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT,
    "proofRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_notes" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "platformName" TEXT NOT NULL DEFAULT 'JAL Trade',
    "slogan" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "primaryCurrency" TEXT NOT NULL DEFAULT 'XAF',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Douala',
    "defaultLanguage" TEXT NOT NULL DEFAULT 'fr',
    "notifyNewTransactions" BOOLEAN NOT NULL DEFAULT true,
    "notifyNewUsers" BOOLEAN NOT NULL DEFAULT true,
    "notifyKycSubmitted" BOOLEAN NOT NULL DEFAULT true,
    "notifyDisputes" BOOLEAN NOT NULL DEFAULT true,
    "notifyDailyReports" BOOLEAN NOT NULL DEFAULT false,
    "notificationEmail" TEXT,
    "autoLockMinutes" INTEGER NOT NULL DEFAULT 30,
    "requireHttps" BOOLEAN NOT NULL DEFAULT true,
    "ipRestriction" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_withdrawals" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(24,8) NOT NULL,
    "currency" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "destination" TEXT,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "platform_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_country_idx" ON "users"("country");

-- CreateIndex
CREATE INDEX "users_kycStatus_idx" ON "users"("kycStatus");

-- CreateIndex
CREATE INDEX "kyc_submissions_userId_idx" ON "kyc_submissions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_quoteId_key" ON "transactions"("quoteId");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- CreateIndex
CREATE INDEX "transactions_providerId_idx" ON "transactions"("providerId");

-- CreateIndex
CREATE INDEX "transaction_events_jalTransactionId_createdAt_idx" ON "transaction_events"("jalTransactionId", "createdAt");

-- CreateIndex
CREATE INDEX "quotes_expiresAt_idx" ON "quotes"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_idempotencyKey_key" ON "payment_attempts"("idempotencyKey");

-- CreateIndex
CREATE INDEX "payment_attempts_jalTransactionId_idx" ON "payment_attempts"("jalTransactionId");

-- CreateIndex
CREATE INDEX "payment_attempts_status_idx" ON "payment_attempts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "provider_orders_idempotencyKey_key" ON "provider_orders"("idempotencyKey");

-- CreateIndex
CREATE INDEX "provider_orders_jalTransactionId_idx" ON "provider_orders"("jalTransactionId");

-- CreateIndex
CREATE INDEX "provider_orders_status_idx" ON "provider_orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "provider_orders_providerId_providerOrderId_key" ON "provider_orders"("providerId", "providerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_transactions_txHash_key" ON "blockchain_transactions"("txHash");

-- CreateIndex
CREATE INDEX "blockchain_transactions_jalTransactionId_idx" ON "blockchain_transactions"("jalTransactionId");

-- CreateIndex
CREATE INDEX "blockchain_transactions_status_idx" ON "blockchain_transactions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_jalTransactionId_key" ON "refunds"("jalTransactionId");

-- CreateIndex
CREATE INDEX "refunds_status_idx" ON "refunds"("status");

-- CreateIndex
CREATE INDEX "idempotency_keys_jalTransactionId_idx" ON "idempotency_keys"("jalTransactionId");

-- CreateIndex
CREATE INDEX "webhook_events_jalTransactionId_idx" ON "webhook_events"("jalTransactionId");

-- CreateIndex
CREATE INDEX "webhook_events_processingStatus_idx" ON "webhook_events"("processingStatus");

-- CreateIndex
CREATE INDEX "webhook_events_receivedAt_idx" ON "webhook_events"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_source_externalEventId_key" ON "webhook_events"("source", "externalEventId");

-- CreateIndex
CREATE INDEX "reconciliation_records_jalTransactionId_runAt_idx" ON "reconciliation_records"("jalTransactionId", "runAt");

-- CreateIndex
CREATE INDEX "reconciliation_records_result_idx" ON "reconciliation_records"("result");

-- CreateIndex
CREATE INDEX "admin_actions_jalTransactionId_idx" ON "admin_actions"("jalTransactionId");

-- CreateIndex
CREATE INDEX "admin_actions_adminId_idx" ON "admin_actions"("adminId");

-- CreateIndex
CREATE INDEX "admin_actions_performedAt_idx" ON "admin_actions"("performedAt");

-- CreateIndex
CREATE UNIQUE INDEX "provider_health_providerId_key" ON "provider_health"("providerId");

-- CreateIndex
CREATE INDEX "provider_health_status_idx" ON "provider_health"("status");

-- CreateIndex
CREATE UNIQUE INDEX "provider_configs_name_key" ON "provider_configs"("name");

-- CreateIndex
CREATE UNIQUE INDEX "countries_name_key" ON "countries"("name");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_key" ON "countries"("code");

-- CreateIndex
CREATE UNIQUE INDEX "country_payment_methods_countryId_name_key" ON "country_payment_methods"("countryId", "name");

-- CreateIndex
CREATE INDEX "wallets_userId_idx" ON "wallets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_crypto_network_address_key" ON "wallets"("userId", "crypto", "network", "address");

-- CreateIndex
CREATE INDEX "saved_mobile_money_methods_userId_idx" ON "saved_mobile_money_methods"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_mobile_money_methods_userId_operatorName_phoneNumber_key" ON "saved_mobile_money_methods"("userId", "operatorName", "phoneNumber");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "notifications_jalTransactionId_idx" ON "notifications"("jalTransactionId");

-- CreateIndex
CREATE INDEX "support_tickets_userId_idx" ON "support_tickets"("userId");

-- CreateIndex
CREATE INDEX "support_tickets_jalTransactionId_idx" ON "support_tickets"("jalTransactionId");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_ticket_notes_ticketId_idx" ON "support_ticket_notes"("ticketId");

-- CreateIndex
CREATE INDEX "user_notes_userId_idx" ON "user_notes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_sessions_adminId_idx" ON "admin_sessions"("adminId");

-- CreateIndex
CREATE INDEX "platform_withdrawals_status_idx" ON "platform_withdrawals"("status");

-- AddForeignKey
ALTER TABLE "kyc_submissions" ADD CONSTRAINT "kyc_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_events" ADD CONSTRAINT "transaction_events_jalTransactionId_fkey" FOREIGN KEY ("jalTransactionId") REFERENCES "transactions"("jalTransactionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_jalTransactionId_fkey" FOREIGN KEY ("jalTransactionId") REFERENCES "transactions"("jalTransactionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_orders" ADD CONSTRAINT "provider_orders_jalTransactionId_fkey" FOREIGN KEY ("jalTransactionId") REFERENCES "transactions"("jalTransactionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_orders" ADD CONSTRAINT "provider_orders_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blockchain_transactions" ADD CONSTRAINT "blockchain_transactions_jalTransactionId_fkey" FOREIGN KEY ("jalTransactionId") REFERENCES "transactions"("jalTransactionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_jalTransactionId_fkey" FOREIGN KEY ("jalTransactionId") REFERENCES "transactions"("jalTransactionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_authorizedBy_fkey" FOREIGN KEY ("authorizedBy") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_records" ADD CONSTRAINT "reconciliation_records_jalTransactionId_fkey" FOREIGN KEY ("jalTransactionId") REFERENCES "transactions"("jalTransactionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_health" ADD CONSTRAINT "provider_health_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "country_payment_methods" ADD CONSTRAINT "country_payment_methods_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_mobile_money_methods" ADD CONSTRAINT "saved_mobile_money_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_notes" ADD CONSTRAINT "support_ticket_notes_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notes" ADD CONSTRAINT "user_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notes" ADD CONSTRAINT "user_notes_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_withdrawals" ADD CONSTRAINT "platform_withdrawals_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
