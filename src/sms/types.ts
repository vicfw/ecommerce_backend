export type SmsMessage = {
  to: string;
  text: string;
};

export interface SmsProvider {
  send(message: SmsMessage): Promise<void>;
}
