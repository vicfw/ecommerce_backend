import { describe, expect, it } from "bun:test";
import {
  isPaymentInFlight,
  orderPayableAmount,
  PAYMENT_INIT_STALE_MS,
} from "./createPendingOrder";

describe("orderPayableAmount", () => {
  it("adds delivery to the product subtotal", () => {
    expect(orderPayableAmount({ totalAmount: 100_000, deliveryAmount: 45_000 })).toBe(
      145_000
    );
  });

  it("subtracts coupon amount without going below delivery", () => {
    expect(
      orderPayableAmount({
        totalAmount: 100_000,
        couponAmount: 30_000,
        deliveryAmount: 45_000,
      })
    ).toBe(115_000);
    expect(
      orderPayableAmount({
        totalAmount: 10_000,
        couponAmount: 50_000,
        deliveryAmount: 5_000,
      })
    ).toBe(5_000);
  });

  it("treats missing amounts as zero", () => {
    expect(orderPayableAmount({ totalAmount: 10, deliveryAmount: null })).toBe(10);
    expect(orderPayableAmount({ totalAmount: null, deliveryAmount: 5 })).toBe(5);
  });
});

describe("isPaymentInFlight", () => {
  const now = Date.parse("2026-11-13T10:00:00.000Z");

  it("locks when a track id exists", () => {
    expect(
      isPaymentInFlight(
        { paymentTrackId: "t1", paymentInitStartedAt: null },
        now
      )
    ).toBe(true);
  });

  it("locks only while payment init is fresh", () => {
    expect(
      isPaymentInFlight(
        {
          paymentTrackId: null,
          paymentInitStartedAt: new Date(now - PAYMENT_INIT_STALE_MS + 1),
        },
        now
      )
    ).toBe(true);

    expect(
      isPaymentInFlight(
        {
          paymentTrackId: null,
          paymentInitStartedAt: new Date(now - PAYMENT_INIT_STALE_MS),
        },
        now
      )
    ).toBe(true);

    expect(
      isPaymentInFlight(
        {
          paymentTrackId: null,
          paymentInitStartedAt: new Date(now - PAYMENT_INIT_STALE_MS - 1),
        },
        now
      )
    ).toBe(false);
  });

  it("does not lock when init never started", () => {
    expect(
      isPaymentInFlight(
        { paymentTrackId: null, paymentInitStartedAt: null },
        now
      )
    ).toBe(false);
  });
});
