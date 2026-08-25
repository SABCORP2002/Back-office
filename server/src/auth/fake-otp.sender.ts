import { Injectable, Logger } from '@nestjs/common';

/**
 * No SMS/email vendor is under contract (CONFIGURABLE). Logs the code
 * instead of sending it — every screen this feeds (AUTH-005, password
 * reset) is otherwise fully wired to real DB state.
 */
@Injectable()
export class FakeOtpSender {
  private readonly logger = new Logger('OTP');

  async send(destination: string, code: string): Promise<void> {
    this.logger.warn(`[fake-otp] would send "${code}" to ${destination}`);
  }
}
