import { InferSelectModel, sql, eq } from "drizzle-orm";
import { orderItemsTable } from "../schema/orderItems";
import { productsTable } from "../schema/products";
import { usersTable } from "../schema/users";
import { addressesTable } from "../schema/addresses";

// Helper function to get order items with products using Drizzle ORM
export const getOrderItemsWithProducts = async (orderId: number) => {
  const { db } = await import("../index");

  const orderItems = await db
    .select({
      id: orderItemsTable.id,
      productId: orderItemsTable.productId,
      quantity: orderItemsTable.quantity,
      itemPrice: orderItemsTable.price,
      product: {
        id: productsTable.id,
        quantity: productsTable.quantity,
        prName: productsTable.prName,
        enName: productsTable.enName,
        slug: productsTable.slug,
        price: productsTable.price,
        discount: productsTable.discount,
        weight: productsTable.weight,
        description: productsTable.description,
        images: productsTable.images,
        point: productsTable.point,
        createdAt: productsTable.createdAt,
        updatedAt: productsTable.updatedAt,
      },
    })
    .from(orderItemsTable)
    .leftJoin(productsTable, eq(orderItemsTable.productId, productsTable.id))
    .where(eq(orderItemsTable.orderId, orderId));

  return orderItems;
};

// Helper function to get user data using Drizzle ORM
export const getUserData = async (userId: number) => {
  const { db } = await import("../index");

  const user = await db
    .select({
      id: usersTable.id,
      phoneNumber: usersTable.phoneNumber,
      name: usersTable.name,
      lastName: usersTable.lastName,
      point: usersTable.point,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  return user[0] || null;
};

// Helper function to get address data using Drizzle ORM
export const getAddressData = async (addressId: number) => {
  const { db } = await import("../index");

  const address = await db
    .select({
      id: addressesTable.id,
      address: addressesTable.address,
      city: addressesTable.city,
      floor: addressesTable.floor,
      isDefault: addressesTable.isDefault,
      plate: addressesTable.plate,
      province: addressesTable.province,
      receiverLastName: addressesTable.receiverLastName,
      receiverPhoneNumber: addressesTable.receiverPhoneNumber,
      street: addressesTable.street,
      updatedAt: addressesTable.updatedAt,
      createdAt: addressesTable.createdAt,
      zipCode: addressesTable.zipCode,
    })
    .from(addressesTable)
    .where(eq(addressesTable.id, addressId))
    .limit(1);

  return address[0] || null;
};

// Legacy functions for backward compatibility (using raw SQL)
export const joinOrderItemQuery = () => {
  return sql<InferSelectModel<typeof orderItemsTable>[]>`
  COALESCE(
    JSON_AGG(
      CASE WHEN ${orderItemsTable.id} IS NOT NULL
      THEN JSON_BUILD_OBJECT(
        'id', ${orderItemsTable.id},
        'productId', ${orderItemsTable.productId},
        'quantity', ${orderItemsTable.quantity},
        'itemPrice', ${orderItemsTable.price},
        'product', CASE 
          WHEN ${productsTable.id} IS NOT NULL 
          THEN JSON_BUILD_OBJECT(
            'id', ${productsTable.id},
            'quantity', ${productsTable.quantity},
            'prName', ${productsTable.prName},
            'enName', ${productsTable.enName},
            'slug', ${productsTable.slug},
            'price', ${productsTable.price},
            'discount', ${productsTable.discount},
            'weight', ${productsTable.weight},
            'description', ${productsTable.description},
            'images', ${productsTable.images},
            'point', ${productsTable.point},
            'createdAt', ${productsTable.createdAt},
            'updatedAt', ${productsTable.updatedAt}
          )
          ELSE NULL
        END
      )
      ELSE NULL END
      ORDER BY ${orderItemsTable.id} DESC
    ) FILTER (WHERE ${orderItemsTable.id} IS NOT NULL),
    '[]'
  )
  `.as("orderItem");
};

export const joinUserQuery = () => {
  return sql<InferSelectModel<typeof usersTable>>`
      COALESCE(
             (SELECT 
              JSON_BUILD_OBJECT(
                 'id', ${usersTable.id},
                 'phoneNumber',${usersTable.phoneNumber},
                 'name',${usersTable.name},
                 'lastName',${usersTable.lastName},
                 'point',${usersTable.point}
               )
             FROM ${usersTable}
             WHERE ${usersTable.id} IS NOT NULL
             LIMIT 1),
             '{}'
           )
         `.as("user");
};

export const joinAddressQuery = () => {
  return sql<InferSelectModel<typeof addressesTable>>`
  COALESCE(
    (
      SELECT
        JSON_BUILD_OBJECT(
          'id', ${addressesTable.id},
         'address', ${addressesTable.address},
         'city', ${addressesTable.city},
         'floor', ${addressesTable.floor},
         'isDefault', ${addressesTable.isDefault},
         'plate', ${addressesTable.plate},
         'province', ${addressesTable.province},
         'receiverLastName', ${addressesTable.receiverLastName},
         'receiverPhoneNumber', ${addressesTable.receiverPhoneNumber},
         'street', ${addressesTable.street},
         'updatedAt', ${addressesTable.updatedAt},
         'createdAt', ${addressesTable.createdAt},
         'zipCode', ${addressesTable.zipCode}
        )
        FROM ${addressesTable}
        WHERE ${addressesTable.id} IS NOT NULL
        LIMIT 1),
        '{}'
  )
  `.as("address");
};
