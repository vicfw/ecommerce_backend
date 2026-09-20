import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { addressesTable } from "../db/schema/addresses";
import { lockUserRow } from "../utils/lockUser";

export const getAddress = async (c: Context) => {
  const user = c.get("user");

  const address = await db.query.addressesTable.findMany({
    where: eq(addressesTable.userId, user.id),
    orderBy: [desc(addressesTable.createdAt)],
  });

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
    await lockUserRow(trx, user.id);

    if (body.isDefault) {
      await trx
        .update(addressesTable)
        .set({ isDefault: false })
        .where(
          and(
            eq(addressesTable.userId, user.id),
            eq(addressesTable.isDefault, true)
          )
        );
    }

    const [address] = await trx
      .insert(addressesTable)
      .values({
        userId: user.id,
        ...body,
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
  const user = c.get("user");

  const address = await db.query.addressesTable.findFirst({
    where: and(eq(addressesTable.id, +id), eq(addressesTable.userId, user.id)),
  });

  if (!address) {
    throw new HTTPException(404, {
      message: "Address not found.",
    });
  }

  const result = await db.transaction(async (trx) => {
    await lockUserRow(trx, user.id);

    // If `isDefault` is set to true, update other addresses to false
    if (body.isDefault) {
      await trx
        .update(addressesTable)
        .set({ isDefault: false })
        .where(
          and(
            eq(addressesTable.userId, user.id),
            eq(addressesTable.isDefault, true),
            ne(addressesTable.id, +id)
          )
        );
    }

    const [updatedAddress] = await trx
      .update(addressesTable)
      .set({ ...body })
      .where(
        and(eq(addressesTable.id, +id), eq(addressesTable.userId, user.id))
      )
      .returning();

    return updatedAddress;
  });

  return c.json({
    success: true,
    data: result,
    message: "Address updated successfully",
  });
};

export const deleteAddress = async (c: Context) => {
  const { id } = c.req.param();
  const user = c.get("user");

  const address = await db.query.addressesTable.findFirst({
    where: and(eq(addressesTable.id, +id), eq(addressesTable.userId, user.id)),
  });

  if (!address) {
    throw new HTTPException(404, {
      message: "Address not found.",
    });
  }

  const result = await db.transaction(async (trx) => {
    // Delete the address
    const [deletedAddress] = await trx
      .delete(addressesTable)
      .where(
        and(eq(addressesTable.id, +id), eq(addressesTable.userId, user.id))
      )
      .returning();

    // If the deleted address was default, set the most recent address as default
    if (address.isDefault) {
      const remainingAddresses = await trx
        .select()
        .from(addressesTable)
        .where(eq(addressesTable.userId, user.id))
        .orderBy(desc(addressesTable.createdAt))
        .limit(1);

      if (remainingAddresses.length > 0) {
        await trx
          .update(addressesTable)
          .set({ isDefault: true })
          .where(eq(addressesTable.id, remainingAddresses[0].id));
      }
    }

    return deletedAddress;
  });

  return c.json({
    success: true,
    data: result,
    message: "Address deleted successfully",
  });
};

export const deleteAddressBulk = async (c: Context) => {
  const body = await c.req.json();
  const { addressIds } = body;
  const user = c.get("user");

  // Verify all addresses belong to the user
  const userAddresses = await db.query.addressesTable.findMany({
    where: and(
      eq(addressesTable.userId, user.id),
      inArray(addressesTable.id, addressIds)
    ),
  });

  if (userAddresses.length !== addressIds.length) {
    throw new HTTPException(400, {
      message: "Some addresses not found or do not belong to you.",
    });
  }

  const result = await db.transaction(async (trx) => {
    // Check if any of the addresses to be deleted are default
    const hasDefaultAddress = userAddresses.some(
      (address) => address.isDefault
    );

    // Delete the addresses
    const deletedAddresses = await trx
      .delete(addressesTable)
      .where(
        and(
          eq(addressesTable.userId, user.id),
          inArray(addressesTable.id, addressIds)
        )
      )
      .returning();

    // If a default address was deleted, set the most recent remaining address as default
    if (hasDefaultAddress) {
      const remainingAddresses = await trx
        .select()
        .from(addressesTable)
        .where(eq(addressesTable.userId, user.id))
        .orderBy(desc(addressesTable.createdAt))
        .limit(1);

      if (remainingAddresses.length > 0) {
        await trx
          .update(addressesTable)
          .set({ isDefault: true })
          .where(eq(addressesTable.id, remainingAddresses[0].id));
      }
    }

    return deletedAddresses;
  });

  return c.json({
    success: true,
    data: result,
    message: `${result.length} addresses deleted successfully`,
  });
};
