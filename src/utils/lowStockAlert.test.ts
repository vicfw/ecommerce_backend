import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import {
  LOW_STOCK_THRESHOLD,
  lowStockAction,
  sendTelegramMessage,
} from "./lowStockAlert";

describe("lowStockAction", () => {
  it("notifies once when available crosses to threshold", () => {
    expect(lowStockAction(LOW_STOCK_THRESHOLD, false)).toEqual({
      type: "notify",
      available: LOW_STOCK_THRESHOLD,
    });
    expect(lowStockAction(LOW_STOCK_THRESHOLD - 1, false)).toEqual({
      type: "notify",
      available: LOW_STOCK_THRESHOLD - 1,
    });
  });

  it("does not notify again while still low", () => {
    expect(lowStockAction(LOW_STOCK_THRESHOLD, true)).toEqual({ type: "noop" });
    expect(lowStockAction(1, true)).toEqual({ type: "noop" });
    expect(lowStockAction(0, true)).toEqual({ type: "noop" });
  });

  it("clears the flag when stock recovers above threshold", () => {
    expect(lowStockAction(LOW_STOCK_THRESHOLD + 1, true)).toEqual({
      type: "clear",
    });
  });

  it("notifies again after a clear (next dip)", () => {
    expect(lowStockAction(LOW_STOCK_THRESHOLD + 1, false)).toEqual({
      type: "noop",
    });
    expect(lowStockAction(LOW_STOCK_THRESHOLD, false)).toEqual({
      type: "notify",
      available: LOW_STOCK_THRESHOLD,
    });
  });
});

describe("sendTelegramMessage", () => {
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalChatId = process.env.TELEGRAM_CHAT_ID;

  afterEach(() => {
    if (originalToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = originalToken;
    if (originalChatId === undefined) delete process.env.TELEGRAM_CHAT_ID;
    else process.env.TELEGRAM_CHAT_ID = originalChatId;
    mock.restore();
  });

  it("returns true without calling Telegram when env is unset", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok")
    );

    await expect(sendTelegramMessage("hello")).resolves.toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts sendMessage when env is set", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "token";
    process.env.TELEGRAM_CHAT_ID = "chat";
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 200 })
    );

    await expect(sendTelegramMessage("hello")).resolves.toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://api.telegram.org/bottoken/sendMessage"
    );
    expect(init).toMatchObject({ method: "POST" });
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({
      chat_id: "chat",
      text: "hello",
    });
  });
});
