import { logger } from "../lib/logger";
import type { SmsMessage, SmsProvider } from "./types";

export class LogSmsProvider implements SmsProvider {
  async send({ to, text }: SmsMessage) {
    logger.info({ to, text }, "sms_stub_sent");
  }
}
