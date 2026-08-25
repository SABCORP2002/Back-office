import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { WebhooksService, BlockchainWebhookPayload, MomoWebhookPayload, ProviderWebhookPayload } from './webhooks.service';

/**
 * Arch §4 / TDS §8. Signature is verified over `JSON.stringify(body)`
 * (see webhook-signature.util.ts) rather than the exact raw bytes — a
 * documented simplification since no raw-body middleware is wired here;
 * production should verify over the untouched request body.
 */
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post('momo/:operator')
  momo(@Param('operator') operator: string, @Body() payload: MomoWebhookPayload, @Headers('x-jal-signature') signature?: string) {
    return this.webhooks.handleMomo(operator, payload, signature);
  }

  @Post('provider/:providerId')
  provider(@Param('providerId') providerId: string, @Body() payload: ProviderWebhookPayload, @Headers('x-jal-signature') signature?: string) {
    return this.webhooks.handleProvider(providerId, payload, signature);
  }

  @Post('blockchain/:network')
  blockchain(@Param('network') network: string, @Body() payload: BlockchainWebhookPayload, @Headers('x-jal-signature') signature?: string) {
    return this.webhooks.handleBlockchain(network, payload, signature);
  }
}
