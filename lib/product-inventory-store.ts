import { randomUUID } from "node:crypto";

import { getPool } from "@/lib/auth-user-store";
import type { InventoryItem } from "@/lib/types";

export type StoredProduct = {
  id: string;
  userId: string | null;
  exportId: string;
  name: string;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  packSize: string | null;
  price: string | null;
  confidence: number;
  evidenceVisual: string | null;
  evidenceVoice: string | null;
  rawItem: InventoryItem;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductInventoryInput = {
  exportId: string;
  products: InventoryItem[];
  userId?: string | null;
};

type ProductInventoryRow = {
  id: string;
  userId: string;
  name: string;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  packSize: string | null;
  price: string | null;
  confidence: number;
};

export type SellerProductSummary = {
  id: string;
  name: string;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  packSize: string | null;
  price: string | null;
  confidence: number;
};

export async function replaceProductsForExport({
  exportId,
  products,
  userId
}: ProductInventoryInput) {
  const client = await getPool().connect();
  const cleanedProducts = products.filter((product) => product.name.trim());

  try {
    await client.query("begin");
    await client.query('delete from "products" where "exportId" = $1', [exportId]);

    for (const product of cleanedProducts) {
      await client.query(
        `
          insert into "products" (
            "id",
            "userId",
            "exportId",
            "name",
            "category",
            "quantity",
            "unit",
            "packSize",
            "price",
            "confidence",
            "evidenceVisual",
            "evidenceVoice",
            "rawItem",
            "createdAt",
            "updatedAt"
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, now(), now())
        `,
        [
          `prd_${randomUUID()}`,
          userId ?? null,
          exportId,
          product.name.trim(),
          product.category ?? null,
          typeof product.quantity === "number" ? product.quantity : null,
          product.unit ?? null,
          product.packSize ?? null,
          product.price ?? null,
          product.confidence,
          product.evidence.visual ?? null,
          product.evidence.voice ?? null,
          JSON.stringify(product)
        ]
      );
    }

    await client.query("commit");

    return {
      saved: cleanedProducts.length
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function listProductsForSellerIds(userIds: string[]) {
  if (!userIds.length) {
    return new Map<string, SellerProductSummary[]>();
  }

  const result = await getPool().query<ProductInventoryRow>(
    `
      select
        "id",
        "userId",
        "name",
        "category",
        "quantity",
        "unit",
        "packSize",
        "price",
        "confidence"
      from "products"
      where "userId" = any($1::text[])
      order by "createdAt" desc, "name" asc
    `,
    [userIds]
  );

  const productsBySeller = new Map<string, SellerProductSummary[]>();

  for (const row of result.rows) {
    const products = productsBySeller.get(row.userId) ?? [];
    products.push({
      id: row.id,
      name: row.name,
      category: row.category,
      quantity: row.quantity,
      unit: row.unit,
      packSize: row.packSize,
      price: row.price,
      confidence: row.confidence
    });
    productsBySeller.set(row.userId, products);
  }

  return productsBySeller;
}

export async function listProductsForStorefront({
  exportId,
  userId
}: {
  exportId?: string | null;
  userId?: string | null;
}) {
  if (exportId?.trim()) {
    const values = userId ? [exportId.trim(), userId] : [exportId.trim()];
    const ownershipClause = userId ? 'and ("userId" = $2 or "userId" is null)' : "";
    const result = await getPool().query<StoredProduct>(
      `
        select *
        from "products"
        where "exportId" = $1
        ${ownershipClause}
        order by "createdAt" asc
      `,
      values
    );

    return result.rows;
  }

  if (!userId) return [];

  const result = await getPool().query<StoredProduct>(
    `
      select *
      from "products"
      where "userId" = $1
        and "exportId" = (
          select "exportId"
          from "products"
          where "userId" = $1
          order by "createdAt" desc
          limit 1
        )
      order by "createdAt" asc
    `,
    [userId]
  );

  return result.rows;
}
