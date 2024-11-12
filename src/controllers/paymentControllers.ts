import { Context } from "hono";
import { prisma } from "../config/prismaClient";
import { HTTPException } from "hono/http-exception";

export const paymentRequest = async (c: Context) => {
  const body = await c.req.json();

  const response = await fetch(process.env.ZIBAL_REQUEST_API_URL!, {
    method: "POST",
    body: JSON.stringify({
      merchant: process.env.ZIBAL_MERCHANT_ID,
      callbackUrl: `${process.env.FRONTEND_URL}/payment/loader`,
      amount: body.amount,
      orderId: body.orderId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  return c.json({
    success: true,
    data: await response.json(),
  });
};

export const verifyPayment = async (c: Context) => {
  const { trackId } = await c.req.json();

  const response = await fetch(process.env.ZIBAL_VERIFY_API_URL!, {
    method: "POST",
    body: JSON.stringify({
      merchant: process.env.ZIBAL_MERCHANT_ID,
      trackId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const verificationData = await response.json();

  if (verificationData.result === 100 || verificationData.result === 201) {
    const updatedOrder = await prisma.order.update({
      where: {
        id: parseInt(verificationData.orderId),
      },
      data: {
        status: "PROCESSING",
      },
    });

    if (!updatedOrder) {
      throw new HTTPException(500, {
        message: "Error while updating order status",
      });
    }

    // Payment was successful, return a success response
    return c.json({
      success: true,
      message: "Payment was successful",
      data: verificationData,
    });
  } else {
    // Verification failed
    return c.json({
      success: false,
      message: "Payment verification failed",
      data: verificationData,
    });
  }
};
