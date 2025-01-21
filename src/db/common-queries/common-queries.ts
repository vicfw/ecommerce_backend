import { InferSelectModel, sql } from "drizzle-orm";
import { orderItemsTable } from "../schema/orderItems";
import { productsTable } from "../schema/products";
import { usersTable } from "../schema/users";
import { addressesTable } from "../schema/addresses";

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
        'product', JSON_BUILD_OBJECT(
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
      )
      ELSE NULL END
      ORDER BY ${orderItemsTable.id} DESC
    ) FILTER (WHERE ${orderItemsTable.id} IS NOT NULL AND ${orderItemsTable.quantity} > 0),
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
