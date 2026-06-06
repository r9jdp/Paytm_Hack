import { randomUUID } from "node:crypto";

import { getPool } from "@/lib/auth-user-store";
import {
  buildMerchantIdentityDefaults,
  type MerchantBusinessType,
  type MerchantFulfillmentType,
  type MerchantIdentitySummary
} from "@/lib/merchant-options";
import {
  listProductsForSellerIds,
  type SellerProductSummary
} from "@/lib/product-inventory-store";

type MerchantIdentityRow = {
  userId?: string;
  storeName: string;
  businessType: string;
  phoneNumber: string;
  gpsLocation: string;
  gpsLatitude: string;
  gpsLongitude: string;
  city: string;
  pincode: string;
  storeTimings: string;
  fulfillmentType: string;
  deliveryRadiusKm: string;
  minimumOrderValue: number;
};

export type MerchantSellerSummary = MerchantIdentitySummary & {
  userId: string;
  products: SellerProductSummary[];
};

export type MerchantIdentityInput = {
  storeName: string;
  businessType: MerchantBusinessType;
  storeTimings: string;
  fulfillmentType: MerchantFulfillmentType;
  deliveryRadiusKm: number;
  minimumOrderValue: number;
};

export async function getMerchantIdentityForUser(userId: string) {
  const result = await getPool().query<MerchantIdentityRow>(
    `
      select
        "storeName",
        "businessType",
        "phoneNumber",
        "gpsLocation",
        "gpsLatitude"::text as "gpsLatitude",
        "gpsLongitude"::text as "gpsLongitude",
        "city",
        "pincode",
        "storeTimings",
        "fulfillmentType",
        "deliveryRadiusKm"::text as "deliveryRadiusKm",
        "minimumOrderValue"
      from "MerchantIdentity"
      where "userId" = $1
      limit 1
    `,
    [userId]
  );

  const row = result.rows[0];
  return row ? fromDatabaseMerchantIdentity(row) : null;
}

export async function listMerchantSellers() {
  const result = await getPool().query<MerchantIdentityRow & { userId: string }>(
    `
      select
        "userId",
        "storeName",
        "businessType",
        "phoneNumber",
        "gpsLocation",
        "gpsLatitude"::text as "gpsLatitude",
        "gpsLongitude"::text as "gpsLongitude",
        "city",
        "pincode",
        "storeTimings",
        "fulfillmentType",
        "deliveryRadiusKm"::text as "deliveryRadiusKm",
        "minimumOrderValue"
      from "MerchantIdentity"
      order by "storeName" asc
    `
  );

  const sellers = result.rows.map((row) => ({
    userId: row.userId,
    ...fromDatabaseMerchantIdentity(row),
    products: []
  }));

  const productsBySeller = await listProductsForSellerIds(sellers.map((seller) => seller.userId));

  return sellers.map((seller) => ({
    ...seller,
    products: productsBySeller.get(seller.userId) ?? []
  }));
}

export async function upsertMerchantIdentity(userId: string, input: MerchantIdentityInput) {
  const defaults = buildMerchantIdentityDefaults(userId);
  const client = await getPool().connect();

  try {
    await client.query("begin");

    const result = await client.query<MerchantIdentityRow>(
      `
        insert into "MerchantIdentity" (
          "id",
          "userId",
          "storeName",
          "businessType",
          "phoneNumber",
          "gpsLocation",
          "gpsLatitude",
          "gpsLongitude",
          "city",
          "pincode",
          "storeTimings",
          "fulfillmentType",
          "deliveryRadiusKm",
          "minimumOrderValue",
          "createdAt",
          "updatedAt"
        )
        values ($1, $2, $3, $4, $5, $6, $7::numeric, $8::numeric, $9, $10, $11, $12, $13::numeric, $14, now(), now())
        on conflict ("userId") do update set
          "storeName" = excluded."storeName",
          "businessType" = excluded."businessType",
          "phoneNumber" = excluded."phoneNumber",
          "gpsLocation" = excluded."gpsLocation",
          "gpsLatitude" = excluded."gpsLatitude",
          "gpsLongitude" = excluded."gpsLongitude",
          "city" = excluded."city",
          "pincode" = excluded."pincode",
          "storeTimings" = excluded."storeTimings",
          "fulfillmentType" = excluded."fulfillmentType",
          "deliveryRadiusKm" = excluded."deliveryRadiusKm",
          "minimumOrderValue" = excluded."minimumOrderValue",
          "updatedAt" = now()
        returning
          "storeName",
          "businessType",
          "phoneNumber",
          "gpsLocation",
          "gpsLatitude"::text as "gpsLatitude",
          "gpsLongitude"::text as "gpsLongitude",
          "city",
          "pincode",
          "storeTimings",
          "fulfillmentType",
          "deliveryRadiusKm"::text as "deliveryRadiusKm",
          "minimumOrderValue"
      `,
      [
        `mid_${randomUUID()}`,
        userId,
        input.storeName,
        toDatabaseBusinessType(input.businessType),
        defaults.phoneNumber,
        defaults.gpsLocation,
        defaults.gpsLatitude,
        defaults.gpsLongitude,
        defaults.city,
        defaults.pincode,
        input.storeTimings,
        toDatabaseFulfillmentType(input.fulfillmentType),
        input.deliveryRadiusKm,
        input.minimumOrderValue
      ]
    );

    await client.query(
      `
        update "User"
        set "role" = 'MERCHANT', "updatedAt" = now()
        where "id" = $1
      `,
      [userId]
    );

    await client.query("commit");
    return fromDatabaseMerchantIdentity(result.rows[0]);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

function toDatabaseBusinessType(type: MerchantBusinessType) {
  return type.toUpperCase();
}

function toDatabaseFulfillmentType(type: MerchantFulfillmentType) {
  return type.toUpperCase();
}

function fromDatabaseMerchantIdentity(row: MerchantIdentityRow): MerchantIdentitySummary {
  return {
    storeName: row.storeName,
    businessType: row.businessType.toLowerCase() as MerchantBusinessType,
    phoneNumber: row.phoneNumber,
    gpsLocation: row.gpsLocation,
    gpsLatitude: row.gpsLatitude,
    gpsLongitude: row.gpsLongitude,
    city: row.city,
    pincode: row.pincode,
    storeTimings: row.storeTimings,
    fulfillmentType: row.fulfillmentType.toLowerCase() as MerchantFulfillmentType,
    deliveryRadiusKm: row.deliveryRadiusKm,
    minimumOrderValue: row.minimumOrderValue
  };
}
