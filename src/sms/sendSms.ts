import { logger } from "../lib/logger";
import { LogSmsProvider } from "./logSmsProvider";
import type { SmsProvider } from "./types";

const createProvider = (): SmsProvider => {
  const driver = (process.env.SMS_PROVIDER ?? "log").toLowerCase();

  if (driver !== "log") {
    logger.warn({ driver }, "sms_provider_unknown_falling_back_to_log");
  }

  return new LogSmsProvider();
};

const provider = createProvider();

export const sendSms = async (to: string, text: string) => {
  const phone = to.trim();
  const body = text.trim();
  if (!phone || !body) return;

  try {
    await provider.send({ to: phone, text: body });
  } catch (err) {
    logger.error({ err, to: phone }, "sms_send_failed");
  }
};

export const sendOtpSms = (phoneNumber: string, code: string | number) =>
  sendSms(phoneNumber, `کد تایید شما: ${code}`);
