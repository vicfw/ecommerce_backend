import { and, eq, ne } from "drizzle-orm";
import { Context } from "hono";
import { db } from "../db";
import { addressesTable } from "../db/schema/addresses";

export const getAddress = async (c: Context) => {
  const user = c.get("user");

  const address = await db.query.addresses.findMany({
    where: eq(addressesTable.userId, user.id),
  });

  console.log(address, "address");

  return c.json({
    success: true,
    data: address,
    message: "Address retrieved successfully",
  });
};

export const createAddress = async (c: Context) => {
  const body = await c.req.json();
  const user = c.get("user");

  const result = await db.transaction(async (trx) => {
    // Check if the user has any addresses
    const hasAddresses = await trx
      .select()
      .from(addressesTable)
      .where(eq(addressesTable.userId, user.id))
      .limit(1) // Use limit to check existence efficiently
      .then((addresses) => addresses.length > 0);

    // Insert the new address
    const [address] = await trx
      .insert(addressesTable)
      .values({
        userId: user.id,
        ...body,
        isDefault: !hasAddresses, // Set to true if no addresses exist
      })
      .returning();

    return address;
  });

  return c.json({
    success: true,
    data: result,
    message: "Address created successfully",
  });
};
export const updateAddress = async (c: Context) => {
  const { id } = c.req.param();
  const body = await c.req.json();

  // If `isDefault` is set in the body, update other addresses
  if (body.isDefault) {
    await db
      .update(addressesTable)
      .set({ isDefault: false })
      .where(
        and(
          eq(addressesTable.userId, body.userId),
          eq(addressesTable.isDefault, true),
          ne(addressesTable.id, +id)
        )
      );
  }

  const [updatedAddress] = await db
    .update(addressesTable)
    .set({ ...body })
    .where(eq(addressesTable.id, +id))
    .returning();

  return c.json({
    success: true,
    data: updatedAddress,
    message: "Address updated successfully",
  });
};
